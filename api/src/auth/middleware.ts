import { Context, Next } from 'hono';
import { auth } from '../auth.js';
import { checkPermission, Permission, ResourceType } from './openfga.js';

// Types for authenticated context
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthContext {
  user: AuthUser;
}

// Middleware to require authentication
export async function requireAuth(c: Context, next: Next) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Attach user to context
  c.set('user', {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  } as AuthUser);

  await next();
}

// Factory function for permission checking middleware
export function requirePermission(
  permission: Permission,
  resourceType: ResourceType,
  getResourceId: (c: Context) => string | null
) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as AuthUser | undefined;
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const resourceId = getResourceId(c);
    if (!resourceId) {
      return c.json({ error: 'Resource ID required' }, 400);
    }

    const allowed = await checkPermission(user.id, permission, resourceType, resourceId);
    
    if (!allowed) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await next();
  };
}

// Middleware to check family membership
export async function requireFamilyMember(c: Context, next: Next) {
  const user = c.get('user') as AuthUser | undefined;
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const familyId = c.req.query('familyId') || c.req.param('familyId');
  
  if (!familyId) {
    return c.json({ error: 'familyId is required' }, 400);
  }

  const allowed = await checkPermission(user.id, 'can_view', 'family', familyId);
  
  if (!allowed) {
    return c.json({ error: 'Not a member of this family' }, 403);
  }

  c.set('familyId', familyId);
  await next();
}

// Middleware to require family admin role
export async function requireFamilyAdmin(c: Context, next: Next) {
  const user = c.get('user') as AuthUser | undefined;
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const familyId = c.req.query('familyId') || c.req.param('familyId');
  
  if (!familyId) {
    return c.json({ error: 'familyId is required' }, 400);
  }

  const allowed = await checkPermission(user.id, 'can_admin', 'family', familyId);
  
  if (!allowed) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  c.set('familyId', familyId);
  await next();
}
