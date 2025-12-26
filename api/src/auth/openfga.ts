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

  // Get or create store
  const stores = await setupClient.listStores();
  let existingStore = stores.stores?.find(s => s.name === 'clairios');

  if (!existingStore) {
    const result = await setupClient.createStore({ name: 'clairios' });
    storeId = result.id!;
    console.log(`Created OpenFGA store: ${storeId}`);
  } else {
    storeId = existingStore.id!;
  }

  // Create client with store
  fgaClient = new OpenFgaClient({
    apiUrl: OPENFGA_API_URL,
    storeId,
    credentials: {
      method: CredentialsMethod.None,
    },
  });

  // Check if we need to write the model
  const models = await fgaClient.readAuthorizationModels();
  if (!models.authorization_models || models.authorization_models.length === 0) {
    // Write the authorization model
    const model = await fgaClient.writeAuthorizationModel({
      schema_version: '1.1',
      type_definitions: [
        { type: 'user' },
        {
          type: 'family',
          relations: {
            admin: { this: {} },
            member: { union: { child: [{ this: {} }, { computedUserset: { relation: 'admin' } }] } },
            child: { this: {} },
            can_view: { union: { child: [{ computedUserset: { relation: 'member' } }, { computedUserset: { relation: 'child' } }] } },
            can_edit: { computedUserset: { relation: 'member' } },
            can_admin: { computedUserset: { relation: 'admin' } },
          },
          metadata: {
            relations: {
              admin: { directly_related_user_types: [{ type: 'user' }] },
              member: { directly_related_user_types: [{ type: 'user' }] },
              child: { directly_related_user_types: [{ type: 'user' }] },
            },
          },
        },
        {
          type: 'recipe',
          relations: {
            family: { this: {} },
            owner: { this: {} },
            can_view: { tupleToUserset: { tupleset: { relation: 'family' }, computedUserset: { relation: 'can_view' } } },
            can_edit: { union: { child: [
              { computedUserset: { relation: 'owner' } },
              { tupleToUserset: { tupleset: { relation: 'family' }, computedUserset: { relation: 'can_edit' } } }
            ] } },
            can_delete: { union: { child: [
              { computedUserset: { relation: 'owner' } },
              { tupleToUserset: { tupleset: { relation: 'family' }, computedUserset: { relation: 'can_admin' } } }
            ] } },
          },
          metadata: {
            relations: {
              family: { directly_related_user_types: [{ type: 'family' }] },
              owner: { directly_related_user_types: [{ type: 'user' }] },
            },
          },
        },
        {
          type: 'shopping_list',
          relations: {
            family: { this: {} },
            owner: { this: {} },
            can_view: { tupleToUserset: { tupleset: { relation: 'family' }, computedUserset: { relation: 'can_view' } } },
            can_edit: { tupleToUserset: { tupleset: { relation: 'family' }, computedUserset: { relation: 'can_view' } } },
            can_delete: { union: { child: [
              { computedUserset: { relation: 'owner' } },
              { tupleToUserset: { tupleset: { relation: 'family' }, computedUserset: { relation: 'can_admin' } } }
            ] } },
          },
          metadata: {
            relations: {
              family: { directly_related_user_types: [{ type: 'family' }] },
              owner: { directly_related_user_types: [{ type: 'user' }] },
            },
          },
        },
        {
          type: 'task',
          relations: {
            family: { this: {} },
            owner: { this: {} },
            assignee: { this: {} },
            can_view: { tupleToUserset: { tupleset: { relation: 'family' }, computedUserset: { relation: 'can_view' } } },
            can_edit: { union: { child: [
              { computedUserset: { relation: 'owner' } },
              { computedUserset: { relation: 'assignee' } },
              { tupleToUserset: { tupleset: { relation: 'family' }, computedUserset: { relation: 'can_edit' } } }
            ] } },
            can_complete: { union: { child: [
              { computedUserset: { relation: 'assignee' } },
              { tupleToUserset: { tupleset: { relation: 'family' }, computedUserset: { relation: 'can_edit' } } }
            ] } },
            can_delete: { union: { child: [
              { computedUserset: { relation: 'owner' } },
              { tupleToUserset: { tupleset: { relation: 'family' }, computedUserset: { relation: 'can_admin' } } }
            ] } },
          },
          metadata: {
            relations: {
              family: { directly_related_user_types: [{ type: 'family' }] },
              owner: { directly_related_user_types: [{ type: 'user' }] },
              assignee: { directly_related_user_types: [{ type: 'user' }] },
            },
          },
        },
      ],
    });
    authorizationModelId = model.authorization_model_id;
    console.log(`Created OpenFGA model: ${authorizationModelId}`);
  } else {
    authorizationModelId = models.authorization_models[0].id!;
  }

  return fgaClient;
}

// Helper types for authorization
export type ResourceType = 'family' | 'recipe' | 'shopping_list' | 'task' | 'meal' | 'calendar_event' | 'reminder';
export type Permission = 'can_view' | 'can_edit' | 'can_delete' | 'can_complete' | 'can_admin';

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
