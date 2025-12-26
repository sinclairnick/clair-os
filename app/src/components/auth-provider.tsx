import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession, signOut as authSignOut } from '@/lib/auth-client';
import { familiesQuery, type FamilyResponse } from '@/lib/queries';

interface AuthContextType {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
  } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  families: FamilyResponse[];
  currentFamily: FamilyResponse | null;
  setCurrentFamilyId: (id: string) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_FAMILY_KEY = 'clairios_current_family';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Use better-auth's useSession hook
  const { data: session, isPending: isLoading } = useSession();
  const user = session?.user ?? null;
  const isAuthenticated = !!user;

  // Families query - only fetch when authenticated
  const familiesQueryResult = useQuery({
    ...familiesQuery(),
    enabled: isAuthenticated,
  });
  const families = familiesQueryResult.data ?? [];

  // Current family selection from localStorage
  const storedFamilyId = typeof window !== 'undefined' 
    ? localStorage.getItem(CURRENT_FAMILY_KEY) 
    : null;
  
  const currentFamily = families.find(f => f.id === storedFamilyId) || families[0] || null;

  const setCurrentFamilyId = (id: string) => {
    localStorage.setItem(CURRENT_FAMILY_KEY, id);
    // Force re-render by invalidating relevant queries
    queryClient.invalidateQueries({ queryKey: ['recipes'] });
    queryClient.invalidateQueries({ queryKey: ['shopping'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const handleSignOut = async () => {
    await authSignOut();
    queryClient.clear();
    window.location.href = '/login';
  };

  // Effect to sync current family to localStorage when families load
  useEffect(() => {
    if (families.length > 0 && !storedFamilyId) {
      localStorage.setItem(CURRENT_FAMILY_KEY, families[0].id);
    }
  }, [families, storedFamilyId]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        families,
        currentFamily,
        setCurrentFamilyId,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Convenience hook for getting current family ID with null check
export function useCurrentFamilyId(): string | null {
  const { currentFamily } = useAuth();
  return currentFamily?.id ?? null;
}
