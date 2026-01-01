import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import {
	api,
	type FamilyResponse,
	type RecipeResponse,
	type ShoppingListResponse,
	type TaskResponse,
	type ShoppingItemResponse,
	type DashboardSummaryResponse,
	ApiError,
} from './api';

// ─────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────

export const queryKeys = {
	families: {
		all: ['families'] as const,
		detail: (id: string) => ['families', id] as const,
	},
	recipes: {
		all: (familyId: string, filters?: Record<string, any>) => ['recipes', { familyId, ...filters }] as const,
		detail: (id: string) => ['recipes', id] as const,
	},
	shopping: {
		lists: (familyId: string) => ['shopping', 'lists', { familyId }] as const,
		list: (id: string) => ['shopping', 'lists', id] as const,
	},
	tasks: {
		all: (familyId: string, status?: string) => ['tasks', { familyId, status }] as const,
		detail: (id: string) => ['tasks', id] as const,
	},
	dashboard: {
		summary: (familyId: string) => ['dashboard', { familyId }] as const,
	},
} as const;

// ─────────────────────────────────────────────────────────────
// Dashboard Queries
// ─────────────────────────────────────────────────────────────

type DashboardSummaryQueryOptions<TData = DashboardSummaryResponse> = Omit<
	UseQueryOptions<DashboardSummaryResponse, ApiError, TData>,
	'queryKey' | 'queryFn'
>;

export function dashboardSummaryQuery<TData = DashboardSummaryResponse>(
	familyId: string,
	options?: DashboardSummaryQueryOptions<TData>
) {
	return {
		queryKey: queryKeys.dashboard.summary(familyId),
		queryFn: () => api.dashboard.getSummary(familyId),
		enabled: !!familyId,
		...options,
	} satisfies UseQueryOptions<DashboardSummaryResponse, ApiError, TData>;
}


// ─────────────────────────────────────────────────────────────
// Family Queries
// ─────────────────────────────────────────────────────────────

type FamiliesQueryOptions<TData = FamilyResponse[]> = Omit<
	UseQueryOptions<FamilyResponse[], ApiError, TData>,
	'queryKey' | 'queryFn'
>;

export function familiesQuery<TData = FamilyResponse[]>(
	options?: FamiliesQueryOptions<TData>
) {
	return {
		queryKey: queryKeys.families.all,
		queryFn: () => api.families.list(),
		...options,
	} satisfies UseQueryOptions<FamilyResponse[], ApiError, TData>;
}

type FamilyQueryOptions<TData = FamilyResponse> = Omit<
	UseQueryOptions<FamilyResponse, ApiError, TData>,
	'queryKey' | 'queryFn'
>;

export function familyQuery<TData = FamilyResponse>(
	id: string,
	options?: FamilyQueryOptions<TData>
) {
	return {
		queryKey: queryKeys.families.detail(id),
		queryFn: () => api.families.get(id),
		enabled: !!id,
		...options,
	} satisfies UseQueryOptions<FamilyResponse, ApiError, TData>;
}

// ─────────────────────────────────────────────────────────────
// Recipe Queries
// ─────────────────────────────────────────────────────────────

type RecipesQueryOptions<TData = RecipeResponse[]> = Omit<
	UseQueryOptions<RecipeResponse[], ApiError, TData>,
	'queryKey' | 'queryFn'
>;

export function recipesQuery<TData = RecipeResponse[]>(
	familyId: string,
	filterOptions?: Parameters<typeof api.recipes.list>[1],
	options?: RecipesQueryOptions<TData>
) {
	return {
		queryKey: queryKeys.recipes.all(familyId, filterOptions),
		queryFn: () => api.recipes.list(familyId, filterOptions),
		enabled: !!familyId,
		...options,
	} satisfies UseQueryOptions<RecipeResponse[], ApiError, TData>;
}

type RecipeQueryOptions<TData = RecipeResponse> = Omit<
	UseQueryOptions<RecipeResponse, ApiError, TData>,
	'queryKey' | 'queryFn'
>;

export function recipeQuery<TData = RecipeResponse>(
	id: string,
	options?: RecipeQueryOptions<TData>
) {
	return {
		queryKey: queryKeys.recipes.detail(id),
		queryFn: () => api.recipes.get(id),
		enabled: !!id,
		...options,
	} satisfies UseQueryOptions<RecipeResponse, ApiError, TData>;
}

// ─────────────────────────────────────────────────────────────
// Shopping Queries
// ─────────────────────────────────────────────────────────────

type ShoppingListsQueryOptions<TData = ShoppingListResponse[]> = Omit<
	UseQueryOptions<ShoppingListResponse[], ApiError, TData>,
	'queryKey' | 'queryFn'
>;

export function shoppingListsQuery<TData = ShoppingListResponse[]>(
	familyId: string,
	options?: ShoppingListsQueryOptions<TData>
) {
	return {
		queryKey: queryKeys.shopping.lists(familyId),
		queryFn: () => api.shopping.lists.list(familyId),
		enabled: !!familyId,
		...options,
	} satisfies UseQueryOptions<ShoppingListResponse[], ApiError, TData>;
}

type ShoppingListQueryOptions<TData = ShoppingListResponse> = Omit<
	UseQueryOptions<ShoppingListResponse, ApiError, TData>,
	'queryKey' | 'queryFn'
>;

export function shoppingListQuery<TData = ShoppingListResponse>(
	id: string,
	options?: ShoppingListQueryOptions<TData>
) {
	return {
		queryKey: queryKeys.shopping.list(id),
		queryFn: () => api.shopping.lists.get(id),
		enabled: !!id,
		...options,
	} satisfies UseQueryOptions<ShoppingListResponse, ApiError, TData>;
}

// ─────────────────────────────────────────────────────────────
// Task Queries
// ─────────────────────────────────────────────────────────────

type TasksQueryOptions<TData = TaskResponse[]> = Omit<
	UseQueryOptions<TaskResponse[], ApiError, TData>,
	'queryKey' | 'queryFn'
>;

export function tasksQuery<TData = TaskResponse[]>(
	familyId: string,
	status?: string,
	options?: TasksQueryOptions<TData>
) {
	return {
		queryKey: queryKeys.tasks.all(familyId, status),
		queryFn: () => api.tasks.list(familyId, status),
		enabled: !!familyId,
		...options,
	} satisfies UseQueryOptions<TaskResponse[], ApiError, TData>;
}

type TaskQueryOptions<TData = TaskResponse> = Omit<
	UseQueryOptions<TaskResponse, ApiError, TData>,
	'queryKey' | 'queryFn'
>;

export function taskQuery<TData = TaskResponse>(
	id: string,
	options?: TaskQueryOptions<TData>
) {
	return {
		queryKey: queryKeys.tasks.detail(id),
		queryFn: () => api.tasks.get(id),
		enabled: !!id,
		...options,
	} satisfies UseQueryOptions<TaskResponse, ApiError, TData>;
}

// ─────────────────────────────────────────────────────────────
// Mutation Option Builders
// ─────────────────────────────────────────────────────────────

type CreateFamilyMutationOptions = Omit<
	UseMutationOptions<FamilyResponse, ApiError, { name: string }>,
	'mutationFn'
>;

export function createFamilyMutation(options?: CreateFamilyMutationOptions) {
	return {
		mutationFn: (data: { name: string }) => api.families.create(data),
		...options,
	} satisfies UseMutationOptions<FamilyResponse, ApiError, { name: string }>;
}

type CreateRecipeMutationOptions = Omit<
	UseMutationOptions<RecipeResponse, ApiError, Parameters<typeof api.recipes.create>[0]>,
	'mutationFn'
>;

export function createRecipeMutation(options?: CreateRecipeMutationOptions) {
	return {
		mutationFn: (data: Parameters<typeof api.recipes.create>[0]) => api.recipes.create(data),
		...options,
	} satisfies UseMutationOptions<RecipeResponse, ApiError, Parameters<typeof api.recipes.create>[0]>;
}

type CreateShoppingListMutationOptions = Omit<
	UseMutationOptions<ShoppingListResponse, ApiError, { familyId: string; name: string }>,
	'mutationFn'
>;

export function createShoppingListMutation(options?: CreateShoppingListMutationOptions) {
	return {
		mutationFn: (data: { familyId: string; name: string }) => api.shopping.lists.create(data),
		...options,
	} satisfies UseMutationOptions<ShoppingListResponse, ApiError, { familyId: string; name: string }>;
}

type ToggleShoppingItemMutationOptions = Omit<
	UseMutationOptions<ShoppingItemResponse, ApiError, string>,
	'mutationFn'
>;

export function toggleShoppingItemMutation(options?: ToggleShoppingItemMutationOptions) {
	return {
		mutationFn: (id: string) => api.shopping.items.toggle(id),
		...options,
	} satisfies UseMutationOptions<ShoppingItemResponse, ApiError, string>;
}

type CreateTaskMutationOptions = Omit<
	UseMutationOptions<TaskResponse, ApiError, Parameters<typeof api.tasks.create>[0]>,
	'mutationFn'
>;

export function createTaskMutation(options?: CreateTaskMutationOptions) {
	return {
		mutationFn: (data: Parameters<typeof api.tasks.create>[0]) => api.tasks.create(data),
		...options,
	} satisfies UseMutationOptions<TaskResponse, ApiError, Parameters<typeof api.tasks.create>[0]>;
}

type CompleteTaskMutationOptions = Omit<
	UseMutationOptions<TaskResponse, ApiError, string>,
	'mutationFn'
>;

export function completeTaskMutation(options?: CompleteTaskMutationOptions) {
	return {
		mutationFn: (id: string) => api.tasks.complete(id),
		...options,
	} satisfies UseMutationOptions<TaskResponse, ApiError, string>;
}

type UpdateShoppingListMutationOptions = Omit<
	UseMutationOptions<ShoppingListResponse, ApiError, { id: string; name?: string; notes?: string | null }>,
	'mutationFn'
>;

export function updateShoppingListMutation(options?: UpdateShoppingListMutationOptions) {
	return {
		mutationFn: ({ id, name, notes }: { id: string; name?: string; notes?: string | null }) => api.shopping.lists.update(id, { name, notes }),
		...options,
	} satisfies UseMutationOptions<ShoppingListResponse, ApiError, { id: string; name?: string; notes?: string | null }>;
}

type DeleteShoppingListMutationOptions = Omit<
	UseMutationOptions<{ success: boolean }, ApiError, string>,
	'mutationFn'
>;

export function deleteShoppingListMutation(options?: DeleteShoppingListMutationOptions) {
	return {
		mutationFn: (id: string) => api.shopping.lists.delete(id),
		...options,
	} satisfies UseMutationOptions<{ success: boolean }, ApiError, string>;
}

type UpdateShoppingItemNameMutationOptions = Omit<
	UseMutationOptions<ShoppingItemResponse, ApiError, { id: string; name: string }>,
	'mutationFn'
>;

export function updateShoppingItemNameMutation(options?: UpdateShoppingItemNameMutationOptions) {
	return {
		mutationFn: ({ id, name }: { id: string; name: string }) => api.shopping.items.updateName(id, name),
		...options,
	} satisfies UseMutationOptions<ShoppingItemResponse, ApiError, { id: string; name: string }>;
}

type UpdateTaskMutationOptions = Omit<
	UseMutationOptions<TaskResponse, ApiError, { id: string; data: Partial<TaskResponse> }>,
	'mutationFn'
>;

export function updateTaskMutation(options?: UpdateTaskMutationOptions) {
	return {
		mutationFn: ({ id, data }: { id: string; data: Partial<TaskResponse> }) => api.tasks.update(id, data),
		...options,
	} satisfies UseMutationOptions<TaskResponse, ApiError, { id: string; data: Partial<TaskResponse> }>;
}

// Re-export types
export type { ApiError };
export {
	type FamilyResponse,
	type RecipeResponse,
	type ShoppingListResponse,
	type ShoppingItemResponse,
	type TaskResponse,
} from './api';

