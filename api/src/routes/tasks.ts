import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { tasks } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import {
  requireAuth,
  requireFamilyMember,
  requirePermission,
  setupResourcePermissions,
  grantRelation,
  type AuthUser
} from '../auth/index.ts';
import type { Variables } from '../index.ts';

export const tasksRouter = new Hono<{ Variables: Variables }>();

// Apply auth to all routes
tasksRouter.use('*', requireAuth);

// Get all tasks for a family
tasksRouter.get('/', requireFamilyMember, async (c) => {
  const familyId = c.get('familyId');
  const status = c.req.query('status');

  const familyTasks = await db.query.tasks.findMany({
    where: eq(tasks.familyId, familyId),
    with: {
      assignee: true,
      createdBy: true,
    },
    orderBy: (tasks, { asc, desc }) => [
      asc(tasks.status),
      asc(tasks.dueDate),
      desc(tasks.priority),
    ],
  });

  // Filter by status if provided
  const filteredTasks = status 
    ? familyTasks.filter(t => t.status === status)
    : familyTasks;

  return c.json(filteredTasks);
});

// Create a new task
const createTaskSchema = z.object({
  familyId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['todo', 'in_progress', 'done', 'canceled', 'pending']).default('todo'),
  dueDate: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().min(0).optional(),
  tags: z.array(z.string()).default([]),
  recurrence: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    interval: z.number().int().min(1),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    endDate: z.string().datetime().optional(),
  }).optional(),
});

tasksRouter.post('/', zValidator('json', createTaskSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json');

  const [task] = await db.insert(tasks).values({
    ...data,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    createdById: user.id,
  }).returning();

  // Set up OpenFGA permissions
  await setupResourcePermissions('task', task.id, data.familyId, user.id);

  // If there's an assignee, add assignee relation
  if (data.assigneeId) {
    await grantRelation('user', data.assigneeId, 'assignee', 'task', task.id);
  }

  return c.json(task, 201);
});

// Get a specific task
tasksRouter.get('/:id',
  requirePermission('can_view', 'task', (c) => c.req.param('id')),
  async (c) => {
    const taskId = c.req.param('id');

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: {
        assignee: true,
        createdBy: true,
      },
    });

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    return c.json(task);
  }
);

// Update a task
const updateTaskSchema = createTaskSchema.partial().omit({ familyId: true });

tasksRouter.patch('/:id',
  requirePermission('can_edit', 'task', (c) => c.req.param('id')),
  zValidator('json', updateTaskSchema),
  async (c) => {
    const taskId = c.req.param('id');
    const data = c.req.valid('json');

    // If assignee is changing, update the OpenFGA relation
    if (data.assigneeId !== undefined) {
      // Grant new assignee relation
      if (data.assigneeId) {
        await grantRelation('user', data.assigneeId, 'assignee', 'task', taskId);
      }
    }

    const [updatedTask] = await db.update(tasks)
      .set({
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      })
      .where(eq(tasks.id, taskId))
      .returning();

    return c.json(updatedTask);
  }
);

// Complete a task
tasksRouter.post('/:id/complete',
  requirePermission('can_complete', 'task', (c) => c.req.param('id')),
  async (c) => {
    const taskId = c.req.param('id');

    const [task] = await db.update(tasks)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();

    return c.json(task);
  }
);

// Reopen a task
tasksRouter.post('/:id/reopen',
  requirePermission('can_edit', 'task', (c) => c.req.param('id')),
  async (c) => {
    const taskId = c.req.param('id');

    const [task] = await db.update(tasks)
      .set({ status: 'pending', completedAt: null })
      .where(eq(tasks.id, taskId))
      .returning();

    return c.json(task);
  }
);

// Delete a task
tasksRouter.delete('/:id',
  requirePermission('can_delete', 'task', (c) => c.req.param('id')),
  async (c) => {
    const taskId = c.req.param('id');

    await db.delete(tasks).where(eq(tasks.id, taskId));

    return c.json({ success: true });
  }
);
