import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { shoppingLists, shoppingItems } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export const shoppingRouter = new Hono();

// Get all shopping lists for a family
shoppingRouter.get('/lists', async (c) => {
	const familyId = c.req.query('familyId');

	if (!familyId) {
		return c.json({ error: 'familyId is required' }, 400);
	}

	const lists = await db.query.shoppingLists.findMany({
		where: eq(shoppingLists.familyId, familyId),
		with: {
			items: true,
		},
		orderBy: (lists, { desc }) => [desc(lists.createdAt)],
	});

	return c.json(lists);
});

// Create a new shopping list
const createListSchema = z.object({
	familyId: z.string().uuid(),
	name: z.string().min(1).max(100),
});

shoppingRouter.post('/lists', zValidator('json', createListSchema), async (c) => {
	const userId = c.req.header('X-User-Id');
	const data = c.req.valid('json');

	const [list] = await db.insert(shoppingLists).values({
		...data,
		createdById: userId,
	}).returning();

	return c.json(list, 201);
});

// Get a specific shopping list
shoppingRouter.get('/lists/:id', async (c) => {
	const listId = c.req.param('id');

	const list = await db.query.shoppingLists.findFirst({
		where: eq(shoppingLists.id, listId),
		with: {
			items: {
				orderBy: (items, { asc }) => [asc(items.sortOrder)],
			},
		},
	});

	if (!list) {
		return c.json({ error: 'Shopping list not found' }, 404);
	}

	return c.json(list);
});

// Add item to shopping list
const addItemSchema = z.object({
	name: z.string().min(1).max(200),
	quantity: z.number().int().min(1).default(1),
	unit: z.string().optional().nullable(),
	category: z.string().optional().nullable(),
	sourceRecipeId: z.string().uuid().optional().nullable(),
	notes: z.string().optional().nullable(),
});

shoppingRouter.post('/lists/:id/items', zValidator('json', addItemSchema), async (c) => {
	const listId = c.req.param('id');
	const userId = c.req.header('X-User-Id');
	const data = c.req.valid('json');

	// Find the minimum sort order to add to top
	const firstItem = await db.query.shoppingItems.findFirst({
		where: eq(shoppingItems.listId, listId),
		orderBy: (items, { asc }) => [asc(items.sortOrder)],
	});

	const sortOrder = firstItem ? firstItem.sortOrder - 1 : 0;

	const [item] = await db.insert(shoppingItems).values({
		listId,
		...data,
		sortOrder,
		addedById: userId,
	}).returning();

	return c.json(item, 201);
});

// Toggle item checked status
shoppingRouter.patch('/items/:id/toggle', async (c) => {
	const itemId = c.req.param('id');

	const item = await db.query.shoppingItems.findFirst({
		where: eq(shoppingItems.id, itemId),
	});

	if (!item) {
		return c.json({ error: 'Item not found' }, 404);
	}

	const [updatedItem] = await db.update(shoppingItems)
		.set({ checked: !item.checked })
		.where(eq(shoppingItems.id, itemId))
		.returning();

	return c.json(updatedItem);
});

// Delete item
shoppingRouter.delete('/items/:id', async (c) => {
	const itemId = c.req.param('id');

	await db.delete(shoppingItems).where(eq(shoppingItems.id, itemId));

	return c.json({ success: true });
});

// Complete a shopping list
shoppingRouter.post('/lists/:id/complete', async (c) => {
	const listId = c.req.param('id');

	const [list] = await db.update(shoppingLists)
		.set({ status: 'completed', completedAt: new Date() })
		.where(eq(shoppingLists.id, listId))
		.returning();

	return c.json(list);
});

// Delete a shopping list
shoppingRouter.delete('/lists/:id', async (c) => {
	const listId = c.req.param('id');

	// Items will be deleted via cascade
	await db.delete(shoppingLists).where(eq(shoppingLists.id, listId));

	return c.json({ success: true });
});

// Rename a shopping list
const updateListSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	notes: z.string().optional().nullable(),
});

shoppingRouter.patch('/lists/:id', zValidator('json', updateListSchema), async (c) => {
	const listId = c.req.param('id');
	const data = c.req.valid('json');

	const [list] = await db.update(shoppingLists)
		.set({
			...(data.name && { name: data.name }),
			...(data.notes !== undefined && { notes: data.notes }),
		})
		.where(eq(shoppingLists.id, listId))
		.returning();

	if (!list) {
		return c.json({ error: 'Shopping list not found' }, 404);
	}

	return c.json(list);
});

// Rename an item
const updateItemNameSchema = z.object({
	name: z.string().min(1).max(200),
});

shoppingRouter.patch('/items/:id/name', zValidator('json', updateItemNameSchema), async (c) => {
	const itemId = c.req.param('id');
	const data = c.req.valid('json');

	const [item] = await db.update(shoppingItems)
		.set({ name: data.name })
		.where(eq(shoppingItems.id, itemId))
		.returning();

	if (!item) {
		return c.json({ error: 'Item not found' }, 404);
	}

	return c.json(item);
});
