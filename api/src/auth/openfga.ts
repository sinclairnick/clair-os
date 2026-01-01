import { OpenFgaClient, CredentialsMethod } from '@openfga/sdk';

const OPENFGA_API_URL = process.env.OPENFGA_API_URL || 'http://localhost:8080';

// OpenFGA client singleton
let fgaClient: OpenFgaClient | null = null;
let storeId: string | null = null;
let authorizationModelId: string | null = null;

export async function getOpenFgaClient(): Promise<OpenFgaClient> {
	if (fgaClient && storeId) {
		return fgaClient;
	}

	// Create client without store first to set up
	const setupClient = new OpenFgaClient({
		apiUrl: OPENFGA_API_URL,
		credentials: {
			method: CredentialsMethod.None,
		},
	});

	// Get store
	const stores = await setupClient.listStores();
	const existingStore = stores.stores?.find(s => s.name === 'clairos');

	if (!existingStore) {
		console.log('OpenFGA store "clairos" not found. Waiting for migration...');
		// Should we throw or return null? The app likely needs it.
		// For now, let's throw to crash and restart until migration is done given restart policy
		throw new Error('OpenFGA store "clairos" not found. Ensure migrations have run.');
	}

	storeId = existingStore.id!;
	console.log(`Using OpenFGA store: ${storeId}`);

	// Create client with store
	fgaClient = new OpenFgaClient({
		apiUrl: OPENFGA_API_URL,
		storeId,
		credentials: {
			method: CredentialsMethod.None,
		},
	});

	return fgaClient;
}

// Helper types for authorization
export type ResourceType = 'family' | 'recipe' | 'shopping_list' | 'task' | 'meal' | 'calendar_event' | 'reminder' | 'bill';
export type Permission = 'can_view' | 'can_edit' | 'can_delete' | 'can_complete' | 'can_admin' | 'can_dismiss' | 'can_pay';

// Check if a user has permission on a resource
export async function checkPermission(
	userId: string,
	permission: Permission,
	resourceType: ResourceType,
	resourceId: string
): Promise<boolean> {
	const client = await getOpenFgaClient();

	const result = await client.check({
		user: `user:${userId}`,
		relation: permission,
		object: `${resourceType}:${resourceId}`,
	});

	return result.allowed ?? false;
}

// Check multiple permissions at once
export async function batchCheckPermissions(
	userId: string,
	checks: Array<{ permission: Permission; resourceType: ResourceType; resourceId: string }>
): Promise<boolean[]> {
	if (checks.length === 0) return [];
	const client = await getOpenFgaClient();

	// Use batchCheck for improved performance and atomicity
	const results = await client.batchCheck({
		checks: checks.map((c) => ({
			user: `user:${userId}`,
			relation: c.permission,
			object: `${c.resourceType}:${c.resourceId}`,
		})),
	});

	return results.result.map((r) => r.allowed ?? false);
}

// Grant a relationship (e.g., make user an admin of family)
export async function grantRelation(
	subjectType: 'user' | 'family',
	subjectId: string,
	relation: string,
	objectType: ResourceType,
	objectId: string
): Promise<void> {
	const client = await getOpenFgaClient();

	await client.write({
		writes: [
			{
				user: `${subjectType}:${subjectId}`,
				relation,
				object: `${objectType}:${objectId}`,
			},
		],
	});
}

// Revoke a relationship
export async function revokeRelation(
	subjectType: 'user' | 'family',
	subjectId: string,
	relation: string,
	objectType: ResourceType,
	objectId: string
): Promise<void> {
	const client = await getOpenFgaClient();

	await client.write({
		deletes: [
			{
				user: `${subjectType}:${subjectId}`,
				relation,
				object: `${objectType}:${objectId}`,
			},
		],
	});
}

// Set up permissions for a new resource (e.g., when creating a recipe)
export async function setupResourcePermissions(
	resourceType: ResourceType,
	resourceId: string,
	familyId: string,
	ownerId: string
): Promise<void> {
	const client = await getOpenFgaClient();

	await client.write({
		writes: [
			{
				user: `family:${familyId}`,
				relation: 'family',
				object: `${resourceType}:${resourceId}`,
			},
			{
				user: `user:${ownerId}`,
				relation: 'owner',
				object: `${resourceType}:${resourceId}`,
			},
		],
	});
}
