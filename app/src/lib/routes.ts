/**
 * Centralized route definitions for the application.
 * Use these templates to ensure consistency across navigation and route matching.
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  FAMILY_SELECT: '/family',
  RECIPES: '/recipes',
  RECIPE_NEW: '/recipes/new',
  RECIPE_DETAIL: (id: string) => `/recipes/${id}`,
  RECIPE_EDIT: (id: string) => `/recipes/${id}/edit`,
  SHOPPING: '/shopping',
  TASKS: '/tasks',
  CALENDAR: '/calendar',
  SETTINGS: '/settings',
  FAMILY_MANAGE: '/settings/family',
  MEMBER_PROFILE: (userId: string) => `/settings/family/members/${userId}`,
} as const;

// Patterns for React Router matching
export const ROUTE_PATTERNS = {
  RECIPE_DETAIL: '/recipes/:recipeId',
  RECIPE_EDIT: '/recipes/:recipeId/edit',
  MEMBER_PROFILE: '/settings/family/members/:userId',
} as const;

