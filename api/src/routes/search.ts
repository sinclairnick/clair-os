import { Hono } from 'hono';
import { db } from '../db/index.ts';
import { recipes, shoppingLists, tasks, reminders, bills } from '../db/schema.ts';
import { eq, and, ilike, or } from 'drizzle-orm';
import type { Variables } from '../index.ts';
import { requireAuth, requireFamilyMember } from '../auth/middleware.ts';
import { batchCheckPermissions } from '../auth/openfga.ts';

export const searchRouter = new Hono<{ Variables: Variables }>();

searchRouter.use('*', requireAuth);
searchRouter.use('*', requireFamilyMember);

searchRouter.get('/', async (c) => {
	const user = c.get('user');
	const familyId = c.get('familyId');
	const query = c.req.query('q');

	if (!query || query.length < 2) {
		return c.json({
			recipes: [],
			shoppingLists: [],
			tasks: [],
			reminders: [],
			bills: [],
		});
	}

	const searchPattern = `%${query}%`;

	// 1. Search DB for candidates in parallel
	const [
		recipeCandidates,
		shoppingListCandidates,
		taskCandidates,
		reminderCandidates,
		billCandidates,
	] = await Promise.all([
		db.query.recipes.findMany({
			where: and(
				eq(recipes.familyId, familyId),
				or(ilike(recipes.title, searchPattern), ilike(recipes.description, searchPattern))
			),
			limit: 10,
		}),
		db.query.shoppingLists.findMany({
			where: and(
				eq(shoppingLists.familyId, familyId),
				ilike(shoppingLists.name, searchPattern)
			),
			limit: 10,
			with: {
				items: {
					columns: { id: true },
				}
			}
		}),
		db.query.tasks.findMany({
			where: and(
				eq(tasks.familyId, familyId),
				or(ilike(tasks.title, searchPattern), ilike(tasks.description, searchPattern))
			),
			limit: 10,
		}),
		db.query.reminders.findMany({
			where: and(
				eq(reminders.familyId, familyId),
				or(ilike(reminders.title, searchPattern), ilike(reminders.description, searchPattern))
			),
			limit: 10,
		}),
		db.query.bills.findMany({
			where: and(
				eq(bills.familyId, familyId),
				or(ilike(bills.name, searchPattern), ilike(bills.description, searchPattern))
			),
			limit: 10,
		}),
	]);

	// 2. Prepare authz checks
	const checks: Array<{ permission: any; resourceType: any; resourceId: string }> = [];

	recipeCandidates.forEach(r => checks.push({ permission: 'can_view', resourceType: 'recipe', resourceId: r.id }));
	shoppingListCandidates.forEach(s => checks.push({ permission: 'can_view', resourceType: 'shopping_list', resourceId: s.id }));
	taskCandidates.forEach(t => checks.push({ permission: 'can_view', resourceType: 'task', resourceId: t.id }));
	reminderCandidates.forEach(rem => checks.push({ permission: 'can_view', resourceType: 'reminder', resourceId: rem.id }));
	billCandidates.forEach(b => checks.push({ permission: 'can_view', resourceType: 'bill', resourceId: b.id }));

	// 3. Run Batch Authz
	const authResults = await batchCheckPermissions(user.id, checks);

	// 4. Filter results based on authz
	let authIdx = 0;

	const filteredRecipes = recipeCandidates.filter(() => authResults[authIdx++]);
	const filteredShoppingLists = shoppingListCandidates.filter(() => authResults[authIdx++]);
	const filteredTasks = taskCandidates.filter(() => authResults[authIdx++]);
	const filteredReminders = reminderCandidates.filter(() => authResults[authIdx++]);
	const filteredBills = billCandidates.filter(() => authResults[authIdx++]);

	return c.json({
		recipes: filteredRecipes,
		shoppingLists: filteredShoppingLists.map(s => ({
			...s,
			itemCount: s.items.length
		})),
		tasks: filteredTasks,
		reminders: filteredReminders,
		bills: filteredBills,
	});
});
