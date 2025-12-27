// API client for frontend
const API_BASE = `${import.meta.env.VITE_API_URL}/api`;

type FetchOptions = RequestInit & {
  params?: Record<string, string>;
};

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new ApiError(response.status, response.statusText, error.error || error.message || 'Request failed');
  }

  return response.json();
}

// ─────────────────────────────────────────────────────────────
// Type definitions for API responses
// ─────────────────────────────────────────────────────────────

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  image?: string;
}

export interface FamilyResponse {
  id: string;
  name: string;
  role: 'admin' | 'member' | 'child';
  displayName: string;
  color: string;
  createdAt: string;
}

export interface RecipeResponse {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  servings: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  instructions: string;
  imageUrl?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredientResponse[];
}

export interface RecipeIngredientResponse {
  id: string;
  recipeId: string;
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
  category?: string;
}

export interface ShoppingListResponse {
  id: string;
  familyId: string;
  name: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  completedAt?: string;
  items: ShoppingItemResponse[];
}

export interface ShoppingItemResponse {
  id: string;
  listId: string;
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  checked: boolean;
  notes?: string;
  sourceRecipeId?: string;
}

export interface TaskResponse {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'done' | 'canceled' | 'pending';
  dueDate?: string;
  estimatedMinutes?: number;
  tags: string[];
  createdAt: string;
  completedAt?: string;
  assignee?: UserResponse;
  createdBy?: UserResponse;
}

export interface InviteResponse {
  id: string;
  familyId: string;
  code: string;
  role: 'admin' | 'member' | 'child';
  expiresAt?: string;
  maxUses?: number;
  uses: number;
  createdAt: string;
}

export interface FamilyMemberResponse {
  userId: string;
  displayName: string;
  role: 'admin' | 'member' | 'child';
  color: string;
  joinedAt: string;
  email: string;
  name: string;
  image?: string;
}

export interface JoinFamilyResponse {
  success: boolean;
  familyId: string;
  familyName: string;
  role: string;
}

export interface CalendarEventResponse {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  memberIds: string[];
  linkedEntityType?: string;
  linkedEntityId?: string;
  color?: string;
  location?: string;
  createdAt: string;
}

export interface MemberProfileResponse {
  member: FamilyMemberResponse;
  tasks: TaskResponse[];
  recipes: RecipeResponse[];
  upcomingEvents: CalendarEventResponse[];
}

// ─────────────────────────────────────────────────────────────
// API methods
// ─────────────────────────────────────────────────────────────

export const api = {
  // Families
  families: {
    list: () => apiFetch<FamilyResponse[]>('/families'),
    get: (id: string) => apiFetch<FamilyResponse>(`/families/${id}`),
    create: (data: { name: string }) =>
      apiFetch<FamilyResponse>('/families', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getMembers: (familyId: string) =>
      apiFetch<FamilyMemberResponse[]>(`/families/${familyId}/members`),
    updateMember: (familyId: string, userId: string, data: { role?: string; displayName?: string; color?: string }) =>
      apiFetch<{ success: boolean }>(`/families/${familyId}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    removeMember: (familyId: string, userId: string) =>
      apiFetch<{ success: boolean }>(`/families/${familyId}/members/${userId}`, {
        method: 'DELETE',
      }),
    // Invites
    getInvites: (familyId: string) =>
      apiFetch<InviteResponse[]>(`/families/${familyId}/invites`),
    createInvite: (familyId: string, data: { role?: string; maxUses?: number; expiresInDays?: number }) =>
      apiFetch<InviteResponse>(`/families/${familyId}/invites`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deleteInvite: (familyId: string, inviteId: string) =>
      apiFetch<{ success: boolean }>(`/families/${familyId}/invites/${inviteId}`, {
        method: 'DELETE',
      }),
    join: (code: string) =>
      apiFetch<JoinFamilyResponse>(`/families/join/${code}`, {
        method: 'POST',
      }),
    // Member Profile
    getMemberProfile: (familyId: string, userId: string) =>
      apiFetch<MemberProfileResponse>(`/families/${familyId}/members/${userId}/profile`),
  },

  // Recipes
  recipes: {
    list: (familyId: string) =>
      apiFetch<RecipeResponse[]>('/recipes', { params: { familyId } }),
    get: (id: string) => apiFetch<RecipeResponse>(`/recipes/${id}`),
    create: (data: Omit<RecipeResponse, 'id' | 'createdAt' | 'updatedAt'>) =>
      apiFetch<RecipeResponse>('/recipes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<RecipeResponse>) =>
      apiFetch<RecipeResponse>(`/recipes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiFetch<{ success: boolean }>(`/recipes/${id}`, { method: 'DELETE' }),
  },

  // Shopping
  shopping: {
    lists: {
      list: (familyId: string) =>
        apiFetch<ShoppingListResponse[]>('/shopping/lists', { params: { familyId } }),
      get: (id: string) => apiFetch<ShoppingListResponse>(`/shopping/lists/${id}`),
      create: (data: { familyId: string; name: string }) =>
        apiFetch<ShoppingListResponse>('/shopping/lists', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (id: string, data: { name: string }) =>
        apiFetch<ShoppingListResponse>(`/shopping/lists/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      complete: (id: string) =>
        apiFetch<ShoppingListResponse>(`/shopping/lists/${id}/complete`, {
          method: 'POST',
        }),
      delete: (id: string) =>
        apiFetch<{ success: boolean }>(`/shopping/lists/${id}`, {
          method: 'DELETE',
        }),
    },
    items: {
      add: (listId: string, data: { name: string; quantity?: number; unit?: string; category?: string; sourceRecipeId?: string; notes?: string }) =>
        apiFetch<ShoppingItemResponse>(`/shopping/lists/${listId}/items`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      toggle: (id: string) =>
        apiFetch<ShoppingItemResponse>(`/shopping/items/${id}/toggle`, {
          method: 'PATCH',
        }),
      updateName: (id: string, name: string) =>
        apiFetch<ShoppingItemResponse>(`/shopping/items/${id}/name`, {
          method: 'PATCH',
          body: JSON.stringify({ name }),
        }),
      delete: (id: string) =>
        apiFetch<{ success: boolean }>(`/shopping/items/${id}`, { method: 'DELETE' }),
    },
  },

  // Tasks
  tasks: {
    list: (familyId: string, status?: string) =>
      apiFetch<TaskResponse[]>('/tasks', {
        params: { familyId, ...(status ? { status } : {}) },
      }),
    get: (id: string) => apiFetch<TaskResponse>(`/tasks/${id}`),
    create: (data: {
      familyId: string;
      title: string;
      description?: string;
      assigneeId?: string;
      priority?: 'low' | 'medium' | 'high';
      status?: 'todo' | 'in_progress' | 'done' | 'canceled' | 'pending';
      dueDate?: string;
      tags?: string[];
    }) =>
      apiFetch<TaskResponse>('/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<TaskResponse>) =>
      apiFetch<TaskResponse>(`/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    complete: (id: string) =>
      apiFetch<TaskResponse>(`/tasks/${id}/complete`, { method: 'POST' }),
    reopen: (id: string) =>
      apiFetch<TaskResponse>(`/tasks/${id}/reopen`, { method: 'POST' }),
    delete: (id: string) =>
      apiFetch<{ success: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),
  },
};

export { ApiError };
