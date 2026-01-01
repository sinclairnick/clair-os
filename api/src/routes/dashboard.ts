import { Hono } from 'hono';
import { db } from '../db/index.ts';
import { recipes, reminders, tasks, shoppingLists, bills } from '../db/schema.ts';
import { desc, eq, and, isNull, gte, or } from 'drizzle-orm';
import type { Variables } from '../index.ts';

export const dashboardRouter = new Hono<{ Variables: Variables }>();

dashboardRouter.get('/', async (c) => {
	const user = c.get('user');
	const familyId = c.req.query('familyId');

	if (!familyId) {
		return c.json({ error: 'Family ID is required' }, 400);
	}

	// Parallelize queries for efficiency
	const [
		recentRecipes,
		upcomingReminders,
		outstandingTasks,
		activeShoppingLists,
		pinnedShoppingLists,
		upcomingBills
	] = await Promise.all([
		// 1. Recent Recipes
		db.query.recipes.findMany({
			where: eq(recipes.familyId, familyId),
			orderBy: [desc(recipes.createdAt)],
			limit: 5,
		}),

		// 2. Upcoming Reminders (not dismissed, future or recent past)
		db.query.reminders.findMany({
			where: and(
				eq(reminders.familyId, familyId),
				eq(reminders.dismissed, false),
			),
			orderBy: [desc(reminders.remindAt)],
			limit: 5,
		}),

		// 3. Outstanding Tasks
		db.query.tasks.findMany({
			where: and(
				eq(tasks.familyId, familyId),
				or(
					eq(tasks.status, 'pending'),
					eq(tasks.status, 'in_progress')
				)
			),
			orderBy: [desc(tasks.priority), desc(tasks.createdAt)],
			limit: 5,
			with: {
				assignee: true,
			}
		}),

		// 4. Active (Non-Pinned) Shopping Lists
		db.query.shoppingLists.findMany({
			where: and(
				eq(shoppingLists.familyId, familyId),
				eq(shoppingLists.status, 'active'),
				eq(shoppingLists.pinned, false)
			),
			orderBy: [desc(shoppingLists.createdAt)],
			limit: 5,
			with: {
				items: {
					where: (items, { eq }) => eq(items.checked, false),
					limit: 3,
				}
			}
		}),

		// 5. Pinned Shopping Lists (Full items)
		db.query.shoppingLists.findMany({
			where: and(
				eq(shoppingLists.familyId, familyId),
				eq(shoppingLists.status, 'active'),
				eq(shoppingLists.pinned, true)
			),
			orderBy: [desc(shoppingLists.createdAt)],
			with: {
				items: {
					orderBy: (items, { asc }) => [asc(items.sortOrder)],
				}
			}
		}),

		// 6. Upcoming Bills
		db.query.bills.findMany({
			where: and(
				eq(bills.familyId, familyId),
				eq(bills.status, 'upcoming')
			),
			orderBy: [desc(bills.dueDate)],
			limit: 5,
		})
	]);

	// Re-sort reminders to be truly "next up" (closest future dates first, then overdue)
	upcomingReminders.sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());

	// Sort bills by due date ascending (soonest due first)
	upcomingBills.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

	return c.json({
		recentRecipes,
		upcomingReminders,
		outstandingTasks,
		activeShoppingLists,
		pinnedShoppingLists,
		upcomingBills
	});
});
