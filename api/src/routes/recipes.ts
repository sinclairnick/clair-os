import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index.js';
import { recipes, recipeIngredients, ingredientGroups } from '../db/schema.js';
import { eq, and, or, gte, lte, ilike, sql, asc, desc, count, getTableColumns } from 'drizzle-orm';
import {
	requireAuth,
	requireFamilyMember,
	requirePermission,
	setupResourcePermissions,
	type AuthUser
} from '../auth/index.js';
import type { Variables } from '../index.js';

export const recipesRouter = new Hono<{ Variables: Variables }>();

// Apply auth to all routes
recipesRouter.use('*', requireAuth);

// Shared ingredient schema
const ingredientSchema = z.object({
	id: z.string().optional(),
	name: z.string().min(1),
	quantity: z.number().default(1),
	unit: z.string().default(''),
	notes: z.string().optional(),
	category: z.string().optional(),
	groupId: z.string().uuid().nullable().optional(),
});

// Ingredient group schema
const ingredientGroupSchema = z.object({
	id: z.string().optional(),
	name: z.string().min(1),
	sortOrder: z.number().optional(),
});

// Get all recipes for a family with search, sort, and filters
recipesRouter.get('/', requireFamilyMember, async (c) => {
	const familyId = c.get('familyId');
	const {
		sort,
		order,
		search,
		minServings,
		maxServings,
		yield: yieldFilter,
		minTime,
		maxTime,
		minIngredients,
		maxIngredients
	} = c.req.query();

	// Subquery for ingredient count
	const sq = db.select({
		recipeId: recipeIngredients.recipeId,
		count: count(recipeIngredients.id).as('count')
	})
		.from(recipeIngredients)
		.groupBy(recipeIngredients.recipeId)
		.as('sq');

	// Select all columns except instructions to reduce payload size
	const { instructions, ...safeRecipeColumns } = getTableColumns(recipes);

	const query = db.select({
		...safeRecipeColumns,
		ingredientCount: sql<number>`coalesce(${sq.count!}, 0)`.mapWith(Number),
	})
		.from(recipes)
		.leftJoin(sq, eq(recipes.id, sq.recipeId))
		.$dynamic();

	// Filters
	const filters = [eq(recipes.familyId, familyId)];

	if (search) {
		const searchLower = search.toLowerCase();
		const searchFilter = or(
			ilike(recipes.title, `%${searchLower}%`),
			ilike(recipes.description, `%${searchLower}%`)
		);
		if (searchFilter) {
			filters.push(searchFilter);
		}
	}

	if (minServings) filters.push(gte(recipes.servings, Number(minServings)));
	if (maxServings) filters.push(lte(recipes.servings, Number(maxServings)));

	if (yieldFilter) {
		filters.push(ilike(recipes.yield, `%${yieldFilter}%`));
	}

	if (minTime) {
		// Total time = prep + cook (treat null as 0)
		const totalTime = sql`coalesce(${recipes.prepTimeMinutes}, 0) + coalesce(${recipes.cookTimeMinutes}, 0)`;
		filters.push(gte(totalTime, Number(minTime)));
	}
	if (maxTime) {
		const totalTime = sql`coalesce(${recipes.prepTimeMinutes}, 0) + coalesce(${recipes.cookTimeMinutes}, 0)`;
		filters.push(lte(totalTime, Number(maxTime)));
	}

	if (minIngredients) {
		filters.push(gte(sql`coalesce(${sq.count}, 0)`, Number(minIngredients)));
	}
	if (maxIngredients) {
		filters.push(lte(sql`coalesce(${sq.count}, 0)`, Number(maxIngredients)));
	}

	query.where(and(...filters));

	// Sorting
	const sortDir = order === 'asc' ? asc : desc;

	if (sort === 'ingredientCount') {
		query.orderBy(sortDir(sql`coalesce(${sq.count}, 0)`));
	} else if (sort === 'totalTime') {
		query.orderBy(sortDir(sql`coalesce(${recipes.prepTimeMinutes}, 0) + coalesce(${recipes.cookTimeMinutes}, 0)`));
	} else {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let sortField: any = recipes.createdAt;
		switch (sort) {
			case 'title': sortField = recipes.title; break;
			case 'createdAt': sortField = recipes.createdAt; break;
			case 'updatedAt': sortField = recipes.updatedAt; break;
			case 'prepTime': sortField = recipes.prepTimeMinutes; break;
			case 'cookTime': sortField = recipes.cookTimeMinutes; break;
			case 'servings': sortField = recipes.servings; break;
		}
		query.orderBy(sortDir(sortField));
	}

	const results = await query;
	return c.json(results);
});

// Create a new recipe
const createRecipeSchema = z.object({
	familyId: z.string().uuid(),
	title: z.string().min(1).max(200),
	description: z.string().optional(),
	servings: z.number().int().min(1).default(4),
	yield: z.string().optional(),
	prepTimeMinutes: z.number().int().min(0).optional(),
	cookTimeMinutes: z.number().int().min(0).optional(),
	instructions: z.string().default(''),
	imageUrl: z.string().url().optional(),
	tags: z.array(z.string()).default([]),
	ingredientGroups: z.array(ingredientGroupSchema).default([]),
	ingredients: z.array(ingredientSchema).default([]),
});

recipesRouter.post('/', zValidator('json', createRecipeSchema), async (c) => {
	const user = c.get('user');
	const data = c.req.valid('json');

	const { ingredients, ingredientGroups: groups, ...recipeData } = data;

	// Create recipe
	const [recipe] = await db.insert(recipes).values({
		...recipeData,
		createdById: user.id,
	}).returning();

	// Create ingredient groups and build ID mapping
	const groupIdMap = new Map<string, string>();

	if (groups.length > 0) {
		// Use batch insert for better performance and reliability
		const createdGroups = await db.insert(ingredientGroups).values(
			groups.map((group, i) => ({
				recipeId: recipe.id,
				name: group.name,
				sortOrder: group.sortOrder ?? i,
			}))
		).returning();

		// Map original IDs to new DB IDs
		// Postgres returning() preserves order of values()
		createdGroups.forEach((createdGroup, i) => {
			const originalGroup = groups[i];
			if (originalGroup && originalGroup.id) {
				groupIdMap.set(originalGroup.id, createdGroup.id);
			}
		});
	}

	// Create ingredients with group references
	if (ingredients.length > 0) {
		await db.insert(recipeIngredients).values(
			ingredients.map((ing, index) => ({
				recipeId: recipe.id,
				name: ing.name,
				quantity: ing.quantity,
				unit: ing.unit,
				notes: ing.notes,
				category: ing.category,
				groupId: ing.groupId ? (groupIdMap.get(ing.groupId) ?? null) : null,
				sortOrder: index,
			}))
		);
	}

	// Set up OpenFGA permissions
	await setupResourcePermissions('recipe', recipe.id, data.familyId, user.id);

	// Fetch complete recipe with ingredients and groups
	const completeRecipe = await db.query.recipes.findFirst({
		where: eq(recipes.id, recipe.id),
		with: {
			ingredientGroups: {
				orderBy: (groups, { asc }) => [asc(groups.sortOrder)],
			},
			ingredients: {
				orderBy: (ingredients, { asc }) => [asc(ingredients.sortOrder)],
			},
		},
	});

	return c.json(completeRecipe, 201);
});

// Get a specific recipe
recipesRouter.get('/:id',
	requirePermission('can_view', 'recipe', (c) => c.req.param('id')),
	async (c) => {
		const recipeId = c.req.param('id');

		const recipe = await db.query.recipes.findFirst({
			where: eq(recipes.id, recipeId),
			with: {
				ingredientGroups: {
					orderBy: (groups, { asc }) => [asc(groups.sortOrder)],
				},
				ingredients: {
					orderBy: (ingredients, { asc }) => [asc(ingredients.sortOrder)],
				},
				createdBy: true,
			},
		});

		if (!recipe) {
			return c.json({ error: 'Recipe not found' }, 404);
		}

		return c.json(recipe);
	}
);

// Update a recipe
const updateRecipeSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().optional(),
	servings: z.number().int().min(1).optional(),
	yield: z.string().optional(),
	prepTimeMinutes: z.number().int().min(0).optional(),
	cookTimeMinutes: z.number().int().min(0).optional(),
	instructions: z.string().optional(),
	imageUrl: z.string().url().optional(),
	tags: z.array(z.string()).optional(),
	ingredientGroups: z.array(ingredientGroupSchema).optional(),
	ingredients: z.array(ingredientSchema).optional(),
});

recipesRouter.patch('/:id',
	requirePermission('can_edit', 'recipe', (c) => c.req.param('id')),
	zValidator('json', updateRecipeSchema),
	async (c) => {
		const recipeId = c.req.param('id');
		const data = c.req.valid('json');

		const { ingredients, ingredientGroups: groups, ...recipeData } = data;

		// Update recipe metadata
		if (Object.keys(recipeData).length > 0) {
			await db.update(recipes)
				.set({ ...recipeData, updatedAt: new Date() })
				.where(eq(recipes.id, recipeId));
		}

		// Build group ID mapping for new groups
		const groupIdMap = new Map<string, string>();

		// Update ingredient groups if provided
		if (groups) {
			const existingGroups = await db.query.ingredientGroups.findMany({
				where: eq(ingredientGroups.recipeId, recipeId),
			});

			const existingGroupIds = new Set(existingGroups.map(g => g.id));
			const incomingGroupIds = new Set(groups.map(g => g.id).filter(id => id && typeof id === 'string'));

			// Delete groups that are not in the new list
			const groupsToDelete = [...existingGroupIds].filter(id => !incomingGroupIds.has(id));
			if (groupsToDelete.length > 0) {
				await Promise.all(
					groupsToDelete.map(id =>
						db.delete(ingredientGroups).where(eq(ingredientGroups.id, id))
					)
				);
			}

			// Upsert groups
			for (let i = 0; i < groups.length; i++) {
				const group = groups[i];
				const groupId = group.id;
				if (groupId && existingGroupIds.has(groupId)) {
					// Update existing
					await db.update(ingredientGroups)
						.set({ name: group.name, sortOrder: group.sortOrder ?? i })
						.where(eq(ingredientGroups.id, groupId));
					groupIdMap.set(groupId, groupId);
				} else {
					// Insert new
					const [createdGroup] = await db.insert(ingredientGroups).values({
						recipeId,
						name: group.name,
						sortOrder: group.sortOrder ?? i,
					}).returning();
					if (groupId) {
						groupIdMap.set(groupId, createdGroup.id);
					}
				}
			}
		}

		// Update ingredients if provided
		if (ingredients) {
			const existingIngredients = await db.query.recipeIngredients.findMany({
				where: eq(recipeIngredients.recipeId, recipeId),
			});

			const existingIds = new Set(existingIngredients.map(i => i.id));
			const incomingIds = new Set(ingredients.map(i => i.id).filter(id => id && typeof id === 'string'));

			// Delete ingredients that are not in the new list
			const idsToDelete = [...existingIds].filter(id => !incomingIds.has(id));
			if (idsToDelete.length > 0) {
				await Promise.all(
					idsToDelete.map(id =>
						db.delete(recipeIngredients).where(eq(recipeIngredients.id, id))
					)
				);
			}

			// Upsert ingredients
			await Promise.all(
				ingredients.map((ing, index) => {
					const ingId = ing.id;
					const resolvedGroupId = ing.groupId
						? (groupIdMap.get(ing.groupId) ?? null)
						: null;

					if (ingId && existingIds.has(ingId)) {
						// Update existing
						return db.update(recipeIngredients)
							.set({
								name: ing.name,
								quantity: ing.quantity,
								unit: ing.unit,
								notes: ing.notes,
								category: ing.category,
								groupId: resolvedGroupId,
								sortOrder: index,
							})
							.where(eq(recipeIngredients.id, ingId));
					} else {
						// Insert new
						return db.insert(recipeIngredients).values({
							recipeId,
							name: ing.name,
							quantity: ing.quantity,
							unit: ing.unit,
							notes: ing.notes,
							category: ing.category,
							groupId: resolvedGroupId,
							sortOrder: index,
						});
					}
				})
			);
		}

		const updatedRecipe = await db.query.recipes.findFirst({
			where: eq(recipes.id, recipeId),
			with: {
				ingredientGroups: {
					orderBy: (groups, { asc }) => [asc(groups.sortOrder)],
				},
				ingredients: {
					orderBy: (ingredients, { asc }) => [asc(ingredients.sortOrder)],
				},
			},
		});

		return c.json(updatedRecipe);
	}
);

// Delete a recipe
recipesRouter.delete('/:id',
	requirePermission('can_delete', 'recipe', (c) => c.req.param('id')),
	async (c) => {
		const recipeId = c.req.param('id');

		await db.delete(recipes).where(eq(recipes.id, recipeId));

		return c.json({ success: true });
	}
);
