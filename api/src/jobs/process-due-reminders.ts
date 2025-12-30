import { Job, Sidequest } from 'sidequest';
import { db } from '../db/index.ts';
import { reminders, reminderAssignees } from '../db/schema.ts';
import { eq, and, lte, isNull, isNotNull } from 'drizzle-orm';
import { SendReminderNotificationJob } from './send-reminder-notification.ts';

/**
 * Scheduled job that runs periodically to find and process due reminders.
 * This job enqueues SendReminderNotificationJob for each due reminder.
 */
export class ProcessDueRemindersJob extends Job {
	async run() {
		const now = new Date();

		// Find all reminders that:
		// 1. Are due (remindAt <= now)
		// 2. Have not been notified yet (notifiedAt IS NULL)
		// 3. Are not dismissed
		const dueReminders = await db.query.reminders.findMany({
			where: and(
				lte(reminders.remindAt, now),
				isNull(reminders.notifiedAt),
				eq(reminders.dismissed, false)
			),
		});

		console.log(`Found ${dueReminders.length} due reminders to process`);

		// Enqueue notification jobs for each due reminder
		for (const reminder of dueReminders) {
			await Sidequest.build(SendReminderNotificationJob).enqueue(reminder.id);
		}

		// Process recurring reminders that have been notified
		// and need their next occurrence calculated
		const notifiedRecurringReminders = await db.query.reminders.findMany({
			where: and(
				isNotNull(reminders.notifiedAt),
				isNotNull(reminders.recurrence),
				eq(reminders.dismissed, false)
			),
		});

		for (const reminder of notifiedRecurringReminders) {
			if (reminder.recurrence && reminder.nextOccurrence) {
				const nextDate = calculateNextOccurrence(
					reminder.nextOccurrence,
					reminder.recurrence as RecurrenceRule
				);

				// Check if we should continue the recurrence
				const recurrence = reminder.recurrence as RecurrenceRule;
				const shouldContinue = !recurrence.endDate || nextDate <= new Date(recurrence.endDate);

				if (shouldContinue) {
					// Update the reminder with the next occurrence and reset notification status
					await db.update(reminders)
						.set({
							remindAt: nextDate,
							nextOccurrence: nextDate,
							notifiedAt: null,
						})
						.where(eq(reminders.id, reminder.id));
				} else {
					// End of recurrence - dismiss the reminder
					await db.update(reminders)
						.set({ dismissed: true })
						.where(eq(reminders.id, reminder.id));
				}
			}
		}

		return {
			dueRemindersProcessed: dueReminders.length,
			recurringRemindersUpdated: notifiedRecurringReminders.length,
		};
	}
}

// Type for recurrence rule
interface RecurrenceRule {
	frequency: 'daily' | 'weekly' | 'monthly';
	interval: number;
	daysOfWeek?: number[];
	endDate?: string;
}

// Helper to calculate next occurrence date
function calculateNextOccurrence(currentDate: Date, rule: RecurrenceRule): Date {
	const next = new Date(currentDate);

	switch (rule.frequency) {
		case 'daily':
			next.setDate(next.getDate() + rule.interval);
			break;
		case 'weekly':
			next.setDate(next.getDate() + (7 * rule.interval));
			break;
		case 'monthly':
			next.setMonth(next.getMonth() + rule.interval);
			break;
	}

	return next;
}

export default ProcessDueRemindersJob;