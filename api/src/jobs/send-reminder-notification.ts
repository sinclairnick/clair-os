import { Job } from 'sidequest';
import { db } from '../db/index.ts';
import { reminders, reminderAssignees } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { sendPushNotification } from '../routes/push.ts';

/**
 * Job to send a push notification for a reminder.
 * Called by the ProcessDueRemindersJob when a reminder is due.
 */
export class SendReminderNotificationJob extends Job {
	async run(reminderId: string) {
		// Fetch the reminder with assignees
		const reminder = await db.query.reminders.findFirst({
			where: eq(reminders.id, reminderId),
			with: {
				assignees: {
					with: {
						user: true,
					},
				},
			},
		});

		if (!reminder) {
			console.log(`Reminder ${reminderId} not found, skipping notification`);
			return { success: false, reason: 'Reminder not found' };
		}

		if (reminder.dismissed) {
			console.log(`Reminder ${reminderId} is dismissed, skipping notification`);
			return { success: false, reason: 'Reminder dismissed' };
		}

		// Send notification to each assignee
		const assigneeUserIds = reminder.assignees.map(a => a.userId);

		if (assigneeUserIds.length === 0) {
			console.log(`Reminder ${reminderId} has no assignees, skipping notification`);
			return { success: false, reason: 'No assignees' };
		}

		const payload = {
			title: reminder.title,
			body: reminder.description || 'You have a reminder!',
			data: {
				type: 'reminder',
				reminderId: reminder.id,
				source: reminder.source,
				sourceEntityType: reminder.sourceEntityType,
				sourceEntityId: reminder.sourceEntityId,
			},
		};

		const results = await Promise.allSettled(
			assigneeUserIds.map(userId => sendPushNotification(userId, payload))
		);

		// Mark reminder as notified
		await db.update(reminders)
			.set({ notifiedAt: new Date() })
			.where(eq(reminders.id, reminderId));

		const successCount = results.filter(r => r.status === 'fulfilled').length;
		console.log(`Sent ${successCount}/${assigneeUserIds.length} notifications for reminder ${reminderId}`);

		return {
			success: true,
			notificationsSent: successCount,
			totalAssignees: assigneeUserIds.length,
		};
	}
}

export default SendReminderNotificationJob;