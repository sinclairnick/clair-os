import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WatchedRecipe {
	id: string;
	title: string;
	checkedIngredients: number[];
	checkedInstructions: string[];
	scaleFactor: number;
	addedAt: number;
	explicit: boolean; // true if user clicked minimize, false if auto-added via interaction
}

interface WatchedRecipesState {
	recipes: Record<string, WatchedRecipe>;

	// Actions
	addRecipe: (recipe: { id: string; title: string; explicit?: boolean }) => void;
	updateRecipe: (id: string, updates: Partial<Omit<WatchedRecipe, 'id' | 'addedAt'>>) => void;
	removeRecipe: (id: string) => void;
	isWatched: (id: string) => boolean;
	getRecipe: (id: string) => WatchedRecipe | undefined;

	// Convenience methods for interaction tracking
	toggleIngredient: (recipeId: string, recipeTitle: string, ingredientIndex: number) => void;
	toggleInstruction: (recipeId: string, recipeTitle: string, instructionId: string) => void;
	setScaleFactor: (recipeId: string, recipeTitle: string, factor: number) => void;
}

export const useWatchedRecipesStore = create<WatchedRecipesState>()(
	persist(
		(set, get) => ({
			recipes: {},

			addRecipe: ({ id, title, explicit = false }) => {
				set((state) => ({
					recipes: {
						...state.recipes,
						[id]: {
							id,
							title,
							checkedIngredients: [],
							checkedInstructions: [],
							scaleFactor: 1,
							addedAt: Date.now(),
							explicit,
						},
					},
				}));
			},

			updateRecipe: (id, updates) => {
				set((state) => {
					const existing = state.recipes[id];
					if (!existing) return state;

					return {
						recipes: {
							...state.recipes,
							[id]: { ...existing, ...updates },
						},
					};
				});
			},

			removeRecipe: (id) => {
				set((state) => {
					const { [id]: _, ...rest } = state.recipes;
					return { recipes: rest };
				});
			},

			isWatched: (id) => {
				return id in get().recipes;
			},

			getRecipe: (id) => {
				return get().recipes[id];
			},

			// Toggle ingredient check - auto-adds recipe to watched if not already
			toggleIngredient: (recipeId, recipeTitle, ingredientIndex) => {
				set((state) => {
					let recipe = state.recipes[recipeId];

					// Auto-add if not watched
					if (!recipe) {
						recipe = {
							id: recipeId,
							title: recipeTitle,
							checkedIngredients: [],
							checkedInstructions: [],
							scaleFactor: 1,
							addedAt: Date.now(),
							explicit: false,
						};
					}

					const checked = [...recipe.checkedIngredients];
					const idx = checked.indexOf(ingredientIndex);
					if (idx === -1) {
						checked.push(ingredientIndex);
					} else {
						checked.splice(idx, 1);
					}

					return {
						recipes: {
							...state.recipes,
							[recipeId]: { ...recipe, checkedIngredients: checked },
						},
					};
				});
			},

			// Toggle instruction check - auto-adds recipe to watched if not already  
			toggleInstruction: (recipeId, recipeTitle, instructionId) => {
				set((state) => {
					let recipe = state.recipes[recipeId];

					if (!recipe) {
						recipe = {
							id: recipeId,
							title: recipeTitle,
							checkedIngredients: [],
							checkedInstructions: [],
							scaleFactor: 1,
							addedAt: Date.now(),
							explicit: false,
						};
					}

					const checked = [...recipe.checkedInstructions];
					const idx = checked.indexOf(instructionId);
					if (idx === -1) {
						checked.push(instructionId);
					} else {
						checked.splice(idx, 1);
					}

					return {
						recipes: {
							...state.recipes,
							[recipeId]: { ...recipe, checkedInstructions: checked },
						},
					};
				});
			},

			// Set scale factor - auto-adds recipe to watched if not already
			setScaleFactor: (recipeId, recipeTitle, factor) => {
				set((state) => {
					let recipe = state.recipes[recipeId];

					if (!recipe) {
						recipe = {
							id: recipeId,
							title: recipeTitle,
							checkedIngredients: [],
							checkedInstructions: [],
							scaleFactor: 1,
							addedAt: Date.now(),
							explicit: false,
						};
					}

					return {
						recipes: {
							...state.recipes,
							[recipeId]: { ...recipe, scaleFactor: factor },
						},
					};
				});
			},
		}),
		{
			name: 'watched-recipes-storage',
			partialize: (state) => ({ recipes: state.recipes }),
		}
	)
);
