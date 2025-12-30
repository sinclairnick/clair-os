import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index.js';
import { families, familyMembers, familyInvites, tasks, recipes, calendarEvents } from '../db/schema.js';
import { eq, and, gte, ne, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
	requireAuth,
	requireFamilyMember,
	requireFamilyAdmin,
	grantRelation,
} from '../auth/index.js';
import type { Variables } from '../index.js';

export const familiesRouter = new Hono<{ Variables: Variables }>();

// Apply auth to all routes
familiesRouter.use('*', requireAuth);

// Get all families for the current user
familiesRouter.get('/', async (c) => {
	const user = c.get('user');

	const userFamilies = await db.query.familyMembers.findMany({
		where: eq(familyMembers.userId, user.id),
		with: {
			family: true,
		},
	});

	return c.json(userFamilies.map(fm => ({
		...fm.family,
		role: fm.role,
		displayName: fm.displayName,
		color: fm.color,
	})));
});

// Create a new family
const createFamilySchema = z.object({
	name: z.string().min(1).max(100),
});

familiesRouter.post('/', zValidator('json', createFamilySchema), async (c) => {
	const user = c.get('user');
	const { name } = c.req.valid('json');

	const [family] = await db.insert(families).values({ name }).returning();

	// Add the creator as admin in database
	await db.insert(familyMembers).values({
		userId: user.id,
		familyId: family.id,
		displayName: user.name,
		role: 'admin',
	});

	// Set up OpenFGA permissions - user is admin of family
	await grantRelation('user', user.id, 'admin', 'family', family.id);

	return c.json({
		...family,
		role: 'admin' as const,
		displayName: user.name,
		color: '#d4a574',
	}, 201);
});

// Get a specific family (must be a member)
familiesRouter.get('/:familyId', requireFamilyMember, async (c) => {
	const familyId = c.get('familyId');

	const family = await db.query.families.findFirst({
		where: eq(families.id, familyId),
		with: {
			members: {
				with: {
					user: true,
				},
			},
		},
	});

	if (!family) {
		return c.json({ error: 'Family not found' }, 404);
	}

	return c.json(family);
});

// Get family members (must be a member)
familiesRouter.get('/:familyId/members', requireFamilyMember, async (c) => {
	const familyId = c.get('familyId');

	const members = await db.query.familyMembers.findMany({
		where: eq(familyMembers.familyId, familyId),
		with: {
			user: true,
		},
	});

	return c.json(members.map(m => ({
		userId: m.userId,
		displayName: m.displayName,
		role: m.role,
		color: m.color,
		joinedAt: m.joinedAt,
		email: m.user.email,
		name: m.user.name,
		image: m.user.image,
	})));
});

// ─────────────────────────────────────────────────────────────
// Invite Links
// ─────────────────────────────────────────────────────────────

// Create an invite link (admin only)
const createInviteSchema = z.object({
	role: z.enum(['admin', 'member', 'child']).default('member'),
	maxUses: z.number().min(1).max(100).optional(),
	expiresInDays: z.number().min(1).max(30).optional(),
});

familiesRouter.post('/:familyId/invites',
	requireFamilyAdmin,
	zValidator('json', createInviteSchema),
	async (c) => {
		const familyId = c.get('familyId');
		const user = c.get('user');
		const { role, maxUses, expiresInDays } = c.req.valid('json');

		const code = nanoid(12);
		const expiresAt = expiresInDays
			? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
			: undefined;

		const [invite] = await db.insert(familyInvites).values({
			familyId,
			code,
			role,
			maxUses,
			expiresAt,
			createdById: user.id,
		}).returning();

		return c.json(invite, 201);
	}
);

// Get all invites for a family (admin only)
familiesRouter.get('/:familyId/invites', requireFamilyAdmin, async (c) => {
	const familyId = c.get('familyId');

	const invites = await db.query.familyInvites.findMany({
		where: eq(familyInvites.familyId, familyId),
		orderBy: (invites, { desc }) => [desc(invites.createdAt)],
	});

	return c.json(invites);
});

// Delete an invite (admin only)
familiesRouter.delete('/:familyId/invites/:inviteId', requireFamilyAdmin, async (c) => {
	const inviteId = c.req.param('inviteId');

	await db.delete(familyInvites).where(eq(familyInvites.id, inviteId));

	return c.json({ success: true });
});

// Accept an invite (public route that requires auth but not family membership)
familiesRouter.post('/join/:code', async (c) => {
	const user = c.get('user');
	const code = c.req.param('code');

	// Find the invite
	const invite = await db.query.familyInvites.findFirst({
		where: eq(familyInvites.code, code),
		with: {
			family: true,
		},
	});

	if (!invite) {
		return c.json({ error: 'Invalid invite code' }, 404);
	}

	// Check if expired
	if (invite.expiresAt && new Date() > invite.expiresAt) {
		return c.json({ error: 'Invite has expired' }, 400);
	}

	// Check if max uses reached
	if (invite.maxUses && invite.uses >= invite.maxUses) {
		return c.json({ error: 'Invite has reached maximum uses' }, 400);
	}

	// Check if already a member
	const existingMembership = await db.query.familyMembers.findFirst({
		where: and(
			eq(familyMembers.userId, user.id),
			eq(familyMembers.familyId, invite.familyId)
		),
	});

	if (existingMembership) {
		return c.json({ error: 'Already a member of this family', familyId: invite.familyId }, 400);
	}

	// Add user to family
	await db.insert(familyMembers).values({
		userId: user.id,
		familyId: invite.familyId,
		displayName: user.name,
		role: invite.role,
	});

	// Update invite usage
	await db.update(familyInvites)
		.set({ uses: invite.uses + 1 })
		.where(eq(familyInvites.id, invite.id));

	// Set up OpenFGA permissions
	await grantRelation('user', user.id, invite.role, 'family', invite.familyId);

	return c.json({
		success: true,
		familyId: invite.familyId,
		familyName: invite.family.name,
		role: invite.role,
	});
});

// ─────────────────────────────────────────────────────────────
// Member Management
// ─────────────────────────────────────────────────────────────

// Update a member's role (admin only)
const updateMemberSchema = z.object({
	role: z.enum(['admin', 'member', 'child']).optional(),
	displayName: z.string().min(1).max(100).optional(),
	color: z.string().optional(),
});

familiesRouter.patch('/:familyId/members/:userId',
	requireFamilyAdmin,
	zValidator('json', updateMemberSchema),
	async (c) => {
		const familyId = c.get('familyId');
		const userId = c.req.param('userId');
		const data = c.req.valid('json');

		// Get current member data to check role change
		const currentMember = await db.query.familyMembers.findFirst({
			where: and(eq(familyMembers.userId, userId), eq(familyMembers.familyId, familyId)),
		});

		if (!currentMember) {
			return c.json({ error: 'Member not found' }, 404);
		}

		// If role is changing, perform validation
		if (data.role && data.role !== currentMember.role) {
			const user = c.get('user');

			// If user is trying to revoke their own admin role
			if (userId === user.id && currentMember.role === 'admin' && data.role !== 'admin') {
				// Check if this is the last admin
				const [adminCount] = await db
					.select({ value: count() })
					.from(familyMembers)
					.where(and(
						eq(familyMembers.familyId, familyId),
						eq(familyMembers.role, 'admin')
					));

				if (adminCount.value === 1) {
					return c.json({ error: 'Cannot revoke your own admin role as you are the last admin' }, 400);
				}
			}

			// Grant new role
			await grantRelation('user', userId, data.role, 'family', familyId);
		}

		// Update database
		await db.update(familyMembers)
			.set(data)
			.where(and(eq(familyMembers.userId, userId), eq(familyMembers.familyId, familyId)));

		return c.json({ success: true });
	}
);

// Remove a member (admin only)
familiesRouter.delete('/:familyId/members/:userId', requireFamilyAdmin, async (c) => {
	const familyId = c.get('familyId');
	const userId = c.req.param('userId');
	const currentUser = c.get('user');

	// Cannot remove yourself
	if (userId === currentUser.id) {
		return c.json({ error: 'Cannot remove yourself' }, 400);
	}

	await db.delete(familyMembers)
		.where(and(eq(familyMembers.userId, userId), eq(familyMembers.familyId, familyId)));

	return c.json({ success: true });
});

// ─────────────────────────────────────────────────────────────
// Member Profile
// ─────────────────────────────────────────────────────────────

// Get a member's profile with their activity (any family member can view)
familiesRouter.get('/:familyId/members/:userId/profile', requireFamilyMember, async (c) => {
	const familyId = c.get('familyId');
	const userId = c.req.param('userId');

	// Get member info
	const member = await db.query.familyMembers.findFirst({
		where: and(eq(familyMembers.userId, userId), eq(familyMembers.familyId, familyId)),
		with: {
			user: true,
		},
	});

	if (!member) {
		return c.json({ error: 'Member not found' }, 404);
	}

	// Get tasks assigned to this user in this family
	const userTasks = await db.query.tasks.findMany({
		where: and(
			eq(tasks.familyId, familyId),
			eq(tasks.assigneeId, userId)
		),
		orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
		limit: 10,
	});

	// Get recipes created by this user in this family
	const userRecipes = await db.query.recipes.findMany({
		where: and(
			eq(recipes.familyId, familyId),
			eq(recipes.createdById, userId)
		),
		orderBy: (recipes, { desc }) => [desc(recipes.createdAt)],
		limit: 10,
		with: {
			ingredients: true,
		},
	});

	// Get upcoming calendar events where this user is involved
	const now = new Date();
	const upcomingEvents = await db.query.calendarEvents.findMany({
		where: and(
			eq(calendarEvents.familyId, familyId),
			gte(calendarEvents.startTime, now)
		),
		orderBy: (events, { asc }) => [asc(events.startTime)],
		limit: 10,
	});

	// Filter events to only those where user is in memberIds
	const userEvents = upcomingEvents.filter(event => {
		const memberIds = event.memberIds as string[];
		return memberIds.includes(userId);
	});

	return c.json({
		member: {
			userId: member.userId,
			displayName: member.displayName,
			role: member.role,
			color: member.color,
			joinedAt: member.joinedAt,
			email: member.user.email,
			name: member.user.name,
			image: member.user.image,
		},
		tasks: userTasks,
		recipes: userRecipes,
		upcomingEvents: userEvents,
	});
});
