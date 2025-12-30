import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { bills, reminders, reminderAssignees, familyMembers } from '../db/schema.ts';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import {
	requireAuth,
	requireFamilyMember,
	requirePermission,
	setupResourcePermissions,
	grantRelation,
} from '../auth/index.ts';
import type { Variables } from '../index.ts';

export const billsRouter = new Hono<{ Variables: Variables }>();

// Apply auth to all routes
billsRouter.use('*', requireAuth);

// List bills for family
billsRouter.get('/', requireFamilyMember, async (c) => {
	const familyId = c.get('familyId');
	const status = c.req.query('status'); // 'upcoming' | 'paid' | 'overdue'
	const frequency = c.req.query('frequency'); // 'once' | 'weekly' | 'monthly' | etc.

	const familyBills = await db.query.bills.findMany({
		where: eq(bills.familyId, familyId),
		with: {
			createdBy: true,
			paidBy: true,
			reminder: {
				with: {
					assignees: {
						with: {
							user: true,
						},
					},
				},
			},
		},
		orderBy: [asc(bills.dueDate)],
	});

	// Apply filters
	let filtered = familyBills;
	if (status) {
		filtered = filtered.filter(b => b.status === status);
	}
	if (frequency) {
		filtered = filtered.filter(b => b.frequency === frequency);
	}

	return c.json(filtered);
});

// Create a new bill
const createBillSchema = z.object({
	familyId: z.string().uuid(),
	name: z.string().min(1).max(200),
	description: z.string().optional(),
	amount: z.number().positive(),
	currency: z.string().length(3).default('NZD'),
	dueDate: z.string().datetime(),
	frequency: z.enum(['once', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly']).default('once'),
	recurrenceEndDate: z.string().datetime().optional(),
	reminderDaysBefore: z.number().int().min(0).max(30).default(3),
	createReminder: z.boolean().default(true),
	reminderAssigneeIds: z.array(z.string()).optional(), // Empty = everyone
});

billsRouter.post('/', zValidator('json', createBillSchema), async (c) => {
	const user = c.get('user');
	const data = c.req.valid('json');

	let reminderId: string | undefined;

	// Create a reminder for the bill if requested
	if (data.createReminder && data.reminderDaysBefore > 0) {
		const dueDate = new Date(data.dueDate);
		const remindAt = new Date(dueDate);
		remindAt.setDate(remindAt.getDate() - data.reminderDaysBefore);

		// Only create reminder if it's in the future
		if (remindAt > new Date()) {
			const [reminder] = await db.insert(reminders).values({
				familyId: data.familyId,
				title: `Bill due: ${data.name}`,
				description: `${data.amount} ${data.currency} due on ${dueDate.toLocaleDateString()}`,
				remindAt,
				source: 'bill',
				sourceEntityType: 'bill',
				createdById: user.id,
			}).returning();

			reminderId = reminder.id;

			// Set up permissions for the reminder
			await setupResourcePermissions('reminder', reminder.id, data.familyId, user.id);

			// Add assignees to the reminder
			let assigneeIds = data.reminderAssigneeIds;
			if (!assigneeIds || assigneeIds.length === 0) {
				const members = await db.query.familyMembers.findMany({
					where: eq(familyMembers.familyId, data.familyId),
				});
				assigneeIds = members.map(m => m.userId);
			}

			if (assigneeIds.length > 0) {
				await db.insert(reminderAssignees).values(
					assigneeIds.map(userId => ({
						reminderId: reminder.id,
						userId,
					}))
				);

				for (const userId of assigneeIds) {
					await grantRelation('user', userId, 'assignee', 'reminder', reminder.id);
				}
			}
		}
	}

	// Create the bill
	const [bill] = await db.insert(bills).values({
		familyId: data.familyId,
		name: data.name,
		description: data.description,
		amount: data.amount,
		currency: data.currency,
		dueDate: new Date(data.dueDate),
		frequency: data.frequency,
		recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : undefined,
		reminderId,
		reminderDaysBefore: data.reminderDaysBefore,
		createdById: user.id,
	}).returning();

	// Update the reminder with the bill ID if we created one
	if (reminderId) {
		await db.update(reminders)
			.set({ sourceEntityId: bill.id })
			.where(eq(reminders.id, reminderId));
	}

	// Set up OpenFGA permissions
	await setupResourcePermissions('bill', bill.id, data.familyId, user.id);

	// Fetch complete bill with relations
	const completeBill = await db.query.bills.findFirst({
		where: eq(bills.id, bill.id),
		with: {
			createdBy: true,
			paidBy: true,
			reminder: {
				with: {
					assignees: {
						with: {
							user: true,
						},
					},
				},
			},
		},
	});

	return c.json(completeBill, 201);
});

// Get a specific bill
billsRouter.get('/:id',
	requirePermission('can_view', 'bill', (c) => c.req.param('id')),
	async (c) => {
		const billId = c.req.param('id');

		const bill = await db.query.bills.findFirst({
			where: eq(bills.id, billId),
			with: {
				createdBy: true,
				paidBy: true,
				reminder: {
					with: {
						assignees: {
							with: {
								user: true,
							},
						},
					},
				},
			},
		});

		if (!bill) {
			return c.json({ error: 'Bill not found' }, 404);
		}

		return c.json(bill);
	}
);

// Update a bill
const updateBillSchema = z.object({
	name: z.string().min(1).max(200).optional(),
	description: z.string().optional(),
	amount: z.number().positive().optional(),
	currency: z.string().length(3).optional(),
	dueDate: z.string().datetime().optional(),
	frequency: z.enum(['once', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly']).optional(),
	recurrenceEndDate: z.string().datetime().optional().nullable(),
	reminderDaysBefore: z.number().int().min(0).max(30).optional(),
});

billsRouter.patch('/:id',
	requirePermission('can_edit', 'bill', (c) => c.req.param('id')),
	zValidator('json', updateBillSchema),
	async (c) => {
		const billId = c.req.param('id');
		const data = c.req.valid('json');

		const existing = await db.query.bills.findFirst({
			where: eq(bills.id, billId),
		});

		if (!existing) {
			return c.json({ error: 'Bill not found' }, 404);
		}

		// Build update object
		const updateData: Record<string, any> = {
			updatedAt: new Date(),
		};
		if (data.name !== undefined) updateData.name = data.name;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.amount !== undefined) updateData.amount = data.amount;
		if (data.currency !== undefined) updateData.currency = data.currency;
		if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
		if (data.frequency !== undefined) updateData.frequency = data.frequency;
		if (data.recurrenceEndDate !== undefined) {
			updateData.recurrenceEndDate = data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null;
		}
		if (data.reminderDaysBefore !== undefined) updateData.reminderDaysBefore = data.reminderDaysBefore;

		await db.update(bills).set(updateData).where(eq(bills.id, billId));

		// Update associated reminder if due date or reminder days changed
		if (existing.reminderId && (data.dueDate !== undefined || data.reminderDaysBefore !== undefined)) {
			const newDueDate = data.dueDate ? new Date(data.dueDate) : existing.dueDate;
			const newDaysBefore = data.reminderDaysBefore ?? existing.reminderDaysBefore;

			const newRemindAt = new Date(newDueDate);
			newRemindAt.setDate(newRemindAt.getDate() - newDaysBefore);

			await db.update(reminders)
				.set({
					remindAt: newRemindAt,
					title: `Bill due: ${data.name ?? existing.name}`,
					description: `${data.amount ?? existing.amount} ${data.currency ?? existing.currency} due on ${newDueDate.toLocaleDateString()}`,
				})
				.where(eq(reminders.id, existing.reminderId));
		}

		// Fetch updated bill
		const updatedBill = await db.query.bills.findFirst({
			where: eq(bills.id, billId),
			with: {
				createdBy: true,
				paidBy: true,
				reminder: {
					with: {
						assignees: {
							with: {
								user: true,
							},
						},
					},
				},
			},
		});

		return c.json(updatedBill);
	}
);

// Mark bill as paid
billsRouter.post('/:id/pay',
	requirePermission('can_pay', 'bill', (c) => c.req.param('id')),
	async (c) => {
		const billId = c.req.param('id');
		const user = c.get('user');

		const existing = await db.query.bills.findFirst({
			where: eq(bills.id, billId),
		});

		if (!existing) {
			return c.json({ error: 'Bill not found' }, 404);
		}

		// Update bill status
		const [updated] = await db.update(bills)
			.set({
				status: 'paid',
				paidAt: new Date(),
				paidById: user.id,
				updatedAt: new Date(),
			})
			.where(eq(bills.id, billId))
			.returning();

		// Dismiss the associated reminder if it exists
		if (existing.reminderId) {
			await db.update(reminders)
				.set({ dismissed: true })
				.where(eq(reminders.id, existing.reminderId));
		}

		// If this is a recurring bill, create the next occurrence
		if (existing.frequency !== 'once') {
			const nextDueDate = calculateNextDueDate(existing.dueDate, existing.frequency);

			// Check if we should create the next occurrence
			const shouldCreate = !existing.recurrenceEndDate || nextDueDate <= existing.recurrenceEndDate;

			if (shouldCreate) {
				// Create next bill occurrence (without the API creating a new one through POST)
				const [nextBill] = await db.insert(bills).values({
					familyId: existing.familyId,
					name: existing.name,
					description: existing.description,
					amount: existing.amount,
					currency: existing.currency,
					dueDate: nextDueDate,
					frequency: existing.frequency,
					recurrenceEndDate: existing.recurrenceEndDate,
					reminderDaysBefore: existing.reminderDaysBefore,
					createdById: existing.createdById,
				}).returning();

				// Create reminder for next occurrence
				const remindAt = new Date(nextDueDate);
				remindAt.setDate(remindAt.getDate() - existing.reminderDaysBefore);

				if (remindAt > new Date()) {
					const [nextReminder] = await db.insert(reminders).values({
						familyId: existing.familyId,
						title: `Bill due: ${existing.name}`,
						description: `${existing.amount} ${existing.currency} due on ${nextDueDate.toLocaleDateString()}`,
						remindAt,
						source: 'bill',
						sourceEntityType: 'bill',
						sourceEntityId: nextBill.id,
						createdById: existing.createdById,
					}).returning();

					// Update bill with reminder id
					await db.update(bills)
						.set({ reminderId: nextReminder.id })
						.where(eq(bills.id, nextBill.id));

					// Copy assignees from old reminder
					if (existing.reminderId) {
						const oldAssignees = await db.query.reminderAssignees.findMany({
							where: eq(reminderAssignees.reminderId, existing.reminderId),
						});

						if (oldAssignees.length > 0) {
							await db.insert(reminderAssignees).values(
								oldAssignees.map(a => ({
									reminderId: nextReminder.id,
									userId: a.userId,
								}))
							);
						}
					}

					// Set up permissions
					await setupResourcePermissions('reminder', nextReminder.id, existing.familyId, existing.createdById!);
				}

				// Set up permissions for the new bill
				await setupResourcePermissions('bill', nextBill.id, existing.familyId, existing.createdById!);
			}
		}

		// Fetch updated bill with relations
		const completeBill = await db.query.bills.findFirst({
			where: eq(bills.id, billId),
			with: {
				createdBy: true,
				paidBy: true,
				reminder: true,
			},
		});

		return c.json(completeBill);
	}
);

// Unmark bill as paid
billsRouter.post('/:id/unpay',
	requirePermission('can_pay', 'bill', (c) => c.req.param('id')),
	async (c) => {
		const billId = c.req.param('id');

		const existing = await db.query.bills.findFirst({
			where: eq(bills.id, billId),
		});

		if (!existing) {
			return c.json({ error: 'Bill not found' }, 404);
		}

		const [updated] = await db.update(bills)
			.set({
				status: 'upcoming',
				paidAt: null,
				paidById: null,
				updatedAt: new Date(),
			})
			.where(eq(bills.id, billId))
			.returning();

		// Undismiss the associated reminder if it exists
		if (existing.reminderId) {
			await db.update(reminders)
				.set({ dismissed: false })
				.where(eq(reminders.id, existing.reminderId));
		}

		return c.json(updated);
	}
);

// Delete a bill
billsRouter.delete('/:id',
	requirePermission('can_delete', 'bill', (c) => c.req.param('id')),
	async (c) => {
		const billId = c.req.param('id');

		const existing = await db.query.bills.findFirst({
			where: eq(bills.id, billId),
		});

		if (!existing) {
			return c.json({ error: 'Bill not found' }, 404);
		}

		// Delete associated reminder first
		if (existing.reminderId) {
			await db.delete(reminders).where(eq(reminders.id, existing.reminderId));
		}

		// Delete the bill
		await db.delete(bills).where(eq(bills.id, billId));

		return c.json({ success: true });
	}
);

// Helper function to calculate next due date based on frequency
function calculateNextDueDate(currentDueDate: Date, frequency: string): Date {
	const next = new Date(currentDueDate);

	switch (frequency) {
		case 'weekly':
			next.setDate(next.getDate() + 7);
			break;
		case 'fortnightly':
			next.setDate(next.getDate() + 14);
			break;
		case 'monthly':
			next.setMonth(next.getMonth() + 1);
			break;
		case 'quarterly':
			next.setMonth(next.getMonth() + 3);
			break;
		case 'yearly':
			next.setFullYear(next.getFullYear() + 1);
			break;
	}

	return next;
}
