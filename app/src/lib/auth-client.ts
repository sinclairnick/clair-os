import { createAuthClient } from 'better-auth/react';

// Create the auth client for React
export const authClient = createAuthClient({
	baseURL: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001',
});


// Export individual methods and hooks for easier imports
export const {
	signIn,
	signUp,
	signOut,
	useSession,
	getSession,
} = authClient;
