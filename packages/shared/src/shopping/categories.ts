import categoriesData from './categories.json';

export const GROCERY_CATEGORIES = categoriesData.categories;
export type GroceryCategory = (typeof GROCERY_CATEGORIES)[number];

export const INGREDIENT_CATEGORY_MAP: Record<string, string> = categoriesData.mappings;

export function inferCategory(itemName: string): string {
	const lowerItem = itemName.toLowerCase();

	// Check for exact matches and partial matches
	for (const [pattern, category] of Object.entries(INGREDIENT_CATEGORY_MAP)) {
		if (lowerItem.includes(pattern.toLowerCase())) {
			return category;
		}
	}

	return 'Other';
}
