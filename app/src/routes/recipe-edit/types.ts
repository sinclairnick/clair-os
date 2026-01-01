import { z } from "zod";

// Common units for ingredient measurement - used as datalist suggestions
export const COMMON_UNITS = [
	"cup", "cups", "tbsp", "tsp", "ml", "l", "fl oz",
	"g", "kg", "oz", "lb", "lbs",
	"whole", "piece", "pieces", "slice", "slices",
	"clove", "cloves", "bunch", "pinch", "can", "jar",
];

export const ingredientSchema = z.object({
	id: z.string(),
	name: z.string().min(1, "Name is required"),
	quantity: z.string().optional(),
	unit: z.string().optional(),
	groupId: z.string().nullable().optional(),
});

export const ingredientGroupSchema = z.object({
	id: z.string(),
	name: z.string().min(1, "Group name is required"),
	isExpanded: z.boolean().default(true),
});

export const recipeFormSchema = z.object({
	title: z.string().min(1, "Title is required"),
	description: z.string().optional(),
	servings: z.number().min(1).default(4),
	yield: z.string().optional(),
	prepTimeMinutes: z.number().optional(),
	cookTimeMinutes: z.number().optional(),
	instructions: z.string().default(""),
	tags: z.array(z.string()).default([]),
	imageUrl: z.string().optional(),
	isSignature: z.boolean().default(false),
	ingredientGroups: z.array(ingredientGroupSchema).default([]),
	ingredients: z.array(ingredientSchema).default([]),
});

export type RecipeFormData = z.infer<typeof recipeFormSchema>;
export type IngredientData = z.infer<typeof ingredientSchema>;
export type IngredientGroupData = z.infer<typeof ingredientGroupSchema>;
