import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index.js';
import { recipes, recipeIngredients } from '../db/schema.js';
import { eq } from 'drizzle-orm';
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

// Get all recipes for a family
recipesRouter.get('/', requireFamilyMember, async (c) => {
  const familyId = c.get('familyId');

  const familyRecipes = await db.query.recipes.findMany({
    where: eq(recipes.familyId, familyId),
    with: {
      ingredients: true,
    },
    orderBy: (recipes, { desc }) => [desc(recipes.createdAt)],
  });

  return c.json(familyRecipes);
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
  ingredients: z.array(z.object({
    name: z.string().min(1),
    quantity: z.number().default(1),
    unit: z.string().default(''),
    notes: z.string().optional(),
    category: z.string().optional(),
  })).default([]),
});

recipesRouter.post('/', zValidator('json', createRecipeSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json');

  const { ingredients, ...recipeData } = data;

  // Create recipe
  const [recipe] = await db.insert(recipes).values({
    ...recipeData,
    createdById: user.id,
  }).returning();

  // Create ingredients
  if (ingredients.length > 0) {
    await db.insert(recipeIngredients).values(
      ingredients.map((ing, index) => ({
        recipeId: recipe.id,
        ...ing,
        sortOrder: index,
      }))
    );
  }

  // Set up OpenFGA permissions
  await setupResourcePermissions('recipe', recipe.id, data.familyId, user.id);

  // Fetch complete recipe with ingredients
  const completeRecipe = await db.query.recipes.findFirst({
    where: eq(recipes.id, recipe.id),
    with: {
      ingredients: true,
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
  ingredients: z.array(z.object({
    id: z.string().optional(), // Allow ID for upsert
    name: z.string().min(1),
    quantity: z.number().default(1),
    unit: z.string().default(''),
    notes: z.string().optional(),
    category: z.string().optional(),
  })).optional(),
});

recipesRouter.patch('/:id', 
  requirePermission('can_edit', 'recipe', (c) => c.req.param('id')),
  zValidator('json', updateRecipeSchema), 
  async (c) => {
    const recipeId = c.req.param('id');
    const data = c.req.valid('json');

    const { ingredients, ...recipeData } = data;

    // Update recipe
    if (Object.keys(recipeData).length > 0) {
      await db.update(recipes)
        .set({ ...recipeData, updatedAt: new Date() })
        .where(eq(recipes.id, recipeId));
    }

    // Update ingredients if provided
    if (ingredients) {
      // 1. Get existing ingredients
      const existingIngredients = await db.query.recipeIngredients.findMany({
        where: eq(recipeIngredients.recipeId, recipeId),
      });

      const existingIds = new Set(existingIngredients.map(i => i.id));
      const incomingIds = new Set(ingredients.map(i => (i as any).id).filter(id => id && typeof id === 'string'));

      // 2. Delete ingredients that are not in the new list
      const idsToDelete = [...existingIds].filter(id => !incomingIds.has(id));
      
      if (idsToDelete.length > 0) {
        // Drizzle doesn't support 'inArray' well with UUIDs in some versions, or we just map
        // To be safe and simple:
        await Promise.all(
          idsToDelete.map(id => 
            db.delete(recipeIngredients).where(eq(recipeIngredients.id, id))
          )
        );
      }

      // 3. Upsert (Update existing or Insert new)
      // We process sequentially to maintain order if validation matters, 
      // but Promise.all is fine for speed.
      await Promise.all(
        ingredients.map((ing, index) => {
          const ingId = (ing as any).id;
          if (ingId && existingIds.has(ingId)) {
            // Update existing
            return db.update(recipeIngredients)
              .set({
                name: ing.name,
                quantity: ing.quantity,
                unit: ing.unit,
                notes: ing.notes,
                category: ing.category,
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
              sortOrder: index,
            });
          }
        })
      );
    }

    const updatedRecipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
      with: {
        ingredients: true,
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
