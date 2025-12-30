import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { reminders, reminderAssignees, familyMembers } from '../db/schema.ts';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import {
	requireAuth,
	requireFamilyMember,
	requirePermission,
	setupResourcePermissions,
	grantRelation,
	type AuthUser
} from '../auth/index.ts';
import type { Variables } from '../index.ts';

export const remindersRouter = new Hono<{ Variables: Variables }>();

// Apply auth to all routes
remindersRouter.use('*', requireAuth);

// List reminders for family
remindersRouter.get('/', requireFamilyMember, async (c) => {
	const familyId = c.get('familyId');
	const source = c.req.query('source'); // 'user' | 'recipe' | 'bill' | 'task'
	const dismissed = c.req.query('dismissed');
	const upcoming = c.req.query('upcoming'); // 'true' to filter to future reminders

	const familyReminders = await db.query.reminders.findMany({
		where: eq(reminders.familyId, familyId),
		with: {
			createdBy: true,
			assignees: {
				with: {
					user: true,
				},
			},
		},
		orderBy: [asc(reminders.remindAt)],
	});

	// Apply filters
	let filtered = familyReminders;
	if (source) {
		filtered = filtered.filter(r => r.source === source);
	}
	if (dismissed === 'true') {
		filtered = filtered.filter(r => r.dismissed);
	} else if (dismissed === 'false') {
		filtered = filtered.filter(r => !r.dismissed);
	}
	if (upcoming === 'true') {
		const now = new Date();
		filtered = filtered.filter(r => r.remindAt >= now);
	}

	return c.json(filtered);
});

// Create a new reminder
const createReminderSchema = z.object({
	familyId: z.string().uuid(),
	title: z.string().min(1).max(200),
	description: z.string().optional(),
	remindAt: z.string().datetime(),
	source: z.enum(['user', 'recipe', 'bill', 'task']).default('user'),
	sourceEntityType: z.string().optional(),
	sourceEntityId: z.string().uuid().optional(),
	recurrence: z.object({
		frequency: z.enum(['daily', 'weekly', 'monthly']),
		interval: z.number().int().min(1),
		daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
		endDate: z.string().datetime().optional(),
	}).optional(),
	assigneeIds: z.array(z.string()).optional(), // Empty = everyone in family
});

remindersRouter.post('/', zValidator('json', createReminderSchema), async (c) => {
	const user = c.get('user');
	const data = c.req.valid('json');

	// Create the reminder
	const [reminder] = await db.insert(reminders).values({
		familyId: data.familyId,
		title: data.title,
		description: data.description,
		remindAt: new Date(data.remindAt),
		source: data.source,
		sourceEntityType: data.sourceEntityType,
		sourceEntityId: data.sourceEntityId,
		recurrence: data.recurrence,
		nextOccurrence: data.recurrence ? new Date(data.remindAt) : undefined,
		createdById: user.id,
	}).returning();

	// Set up OpenFGA permissions
	await setupResourcePermissions('reminder', reminder.id, data.familyId, user.id);

	// Add assignees
	let assigneeIds = data.assigneeIds;

	// If no specific assignees, assign to all family members
	if (!assigneeIds || assigneeIds.length === 0) {
		const members = await db.query.familyMembers.findMany({
			where: eq(familyMembers.familyId, data.familyId),
		});
		assigneeIds = members.map(m => m.userId);
	}

	// Insert assignee records
	if (assigneeIds.length > 0) {
		await db.insert(reminderAssignees).values(
			assigneeIds.map(userId => ({
				reminderId: reminder.id,
				userId,
			}))
		);

		// Grant OpenFGA assignee relation for each
		for (const userId of assigneeIds) {
			await grantRelation('user', userId, 'assignee', 'reminder', reminder.id);
		}
	}

	// Fetch the complete reminder with relations
	const completeReminder = await db.query.reminders.findFirst({
		where: eq(reminders.id, reminder.id),
		with: {
			createdBy: true,
			assignees: {
				with: {
					user: true,
				},
			},
		},
	});

	return c.json(completeReminder, 201);
});

// Get a specific reminder
remindersRouter.get('/:id',
	requirePermission('can_view', 'reminder', (c) => c.req.param('id')),
	async (c) => {
		const reminderId = c.req.param('id');

		const reminder = await db.query.reminders.findFirst({
			where: eq(reminders.id, reminderId),
			with: {
				createdBy: true,
				assignees: {
					with: {
						user: true,
					},
				},
			},
		});

		if (!reminder) {
			return c.json({ error: 'Reminder not found' }, 404);
		}

		return c.json(reminder);
	}
);

// Update a reminder
const updateReminderSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().optional(),
	remindAt: z.string().datetime().optional(),
	recurrence: z.object({
		frequency: z.enum(['daily', 'weekly', 'monthly']),
		interval: z.number().int().min(1),
		daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
		endDate: z.string().datetime().optional(),
	}).optional().nullable(),
	assigneeIds: z.array(z.string()).optional(),
});

remindersRouter.patch('/:id',
	requirePermission('can_edit', 'reminder', (c) => c.req.param('id')),
	zValidator('json', updateReminderSchema),
	async (c) => {
		const reminderId = c.req.param('id');
		const data = c.req.valid('json');

		// Check if this is a resource-owned reminder
		const existing = await db.query.reminders.findFirst({
			where: eq(reminders.id, reminderId),
		});

		if (!existing) {
			return c.json({ error: 'Reminder not found' }, 404);
		}

		// Resource-owned reminders can only have limited fields edited
		if (existing.source !== 'user') {
			// Only allow updating remindAt and assigneeIds for resource-owned reminders
			const allowedFields = ['remindAt', 'assigneeIds'];
			const providedFields = Object.keys(data);
			const disallowedFields = providedFields.filter(f => !allowedFields.includes(f));

			if (disallowedFields.length > 0) {
				return c.json({
					error: `Cannot modify ${disallowedFields.join(', ')} for resource-owned reminders`
				}, 400);
			}
		}

		// Update reminder fields
		const updateData: Record<string, any> = {};
		if (data.title !== undefined) updateData.title = data.title;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.remindAt !== undefined) {
			updateData.remindAt = new Date(data.remindAt);
			if (existing.recurrence) {
				updateData.nextOccurrence = new Date(data.remindAt);
			}
		}
		if (data.recurrence !== undefined) {
			updateData.recurrence = data.recurrence;
			updateData.nextOccurrence = data.recurrence ? new Date(existing.remindAt) : null;
		}

		if (Object.keys(updateData).length > 0) {
			await db.update(reminders)
				.set(updateData)
				.where(eq(reminders.id, reminderId));
		}

		// Update assignees if provided
		if (data.assigneeIds !== undefined) {
			// Remove existing assignees
			await db.delete(reminderAssignees)
				.where(eq(reminderAssignees.reminderId, reminderId));

			// Add new assignees
			if (data.assigneeIds.length > 0) {
				await db.insert(reminderAssignees).values(
					data.assigneeIds.map(userId => ({
						reminderId,
						userId,
					}))
				);

				for (const userId of data.assigneeIds) {
					await grantRelation('user', userId, 'assignee', 'reminder', reminderId);
				}
			}
		}

		// Fetch updated reminder
		const updatedReminder = await db.query.reminders.findFirst({
			where: eq(reminders.id, reminderId),
			with: {
				createdBy: true,
				assignees: {
					with: {
						user: true,
					},
				},
			},
		});

		return c.json(updatedReminder);
	}
);

// Dismiss a reminder
remindersRouter.post('/:id/dismiss',
	requirePermission('can_dismiss', 'reminder', (c) => c.req.param('id')),
	async (c) => {
		const reminderId = c.req.param('id');

		const [updated] = await db.update(reminders)
			.set({ dismissed: true })
			.where(eq(reminders.id, reminderId))
			.returning();

		return c.json(updated);
	}
);

// Undismiss a reminder
remindersRouter.post('/:id/undismiss',
	requirePermission('can_dismiss', 'reminder', (c) => c.req.param('id')),
	async (c) => {
		const reminderId = c.req.param('id');

		const [updated] = await db.update(reminders)
			.set({ dismissed: false })
			.where(eq(reminders.id, reminderId))
			.returning();

		return c.json(updated);
	}
);

// Delete a reminder
remindersRouter.delete('/:id',
	requirePermission('can_delete', 'reminder', (c) => c.req.param('id')),
	async (c) => {
		const reminderId = c.req.param('id');

		// Check if this is a resource-owned reminder
		const existing = await db.query.reminders.findFirst({
			where: eq(reminders.id, reminderId),
		});

		if (!existing) {
			return c.json({ error: 'Reminder not found' }, 404);
		}

		// Don't allow deleting resource-owned reminders directly
		if (existing.source !== 'user') {
			return c.json({
				error: 'Cannot delete resource-owned reminders directly. Delete the source resource instead.'
			}, 400);
		}

		await db.delete(reminders).where(eq(reminders.id, reminderId));

		return c.json({ success: true });
	}
);
