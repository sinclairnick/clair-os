import { createAuthClient } from 'better-auth/react';

// Create the auth client for React
// This provides hooks like useSession and methods like signIn.social
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

// Export individual methods and hooks for easier imports
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
