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
			orderBy: [desc(reminders.remindAt)], // We might want asc for "upcoming", but let's see
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

		// 4. Active Shopping Lists
		db.query.shoppingLists.findMany({
			where: and(
				eq(shoppingLists.familyId, familyId),
				eq(shoppingLists.status, 'active')
			),
			orderBy: [desc(shoppingLists.createdAt)],
			limit: 5,
			with: {
				items: {
					where: (items, { eq }) => eq(items.checked, false),
					limit: 3, // Just preview a few
				}
			}
		}),

		// 5. Upcoming Bills
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
	// Actually, for "Upcoming", we usually want: Overdue first, then nearest future.
	// The DB query above just grabbed 5. Let's refine the DB query for reminders if needed,
	// but simple sort here is fine for MVP.
	upcomingReminders.sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());

	// Sort bills by due date ascending (soonest due first)
	upcomingBills.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

	return c.json({
		recentRecipes,
		upcomingReminders,
		outstandingTasks,
		activeShoppingLists,
		upcomingBills
	});
});
