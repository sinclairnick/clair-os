import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  lastShoppingListId: string | null;
  lastFamilyId: string | null;
  taskViewMode: 'list' | 'kanban';
  setLastShoppingListId: (id: string | null) => void;
  setLastFamilyId: (id: string | null) => void;
  setTaskViewMode: (mode: 'list' | 'kanban') => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      lastShoppingListId: null,
      lastFamilyId: null,
      taskViewMode: 'list',
      setLastShoppingListId: (id) => set({ lastShoppingListId: id }),
      setLastFamilyId: (id) => set({ lastFamilyId: id }),
      setTaskViewMode: (mode) => set({ taskViewMode: mode }),
    }),
    {
      name: 'clair-os-storage',
    }
  )
);
