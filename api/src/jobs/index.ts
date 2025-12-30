import { Sidequest } from 'sidequest';
import { ProcessDueRemindersJob } from './process-due-reminders.ts';
import { SendReminderNotificationJob } from './send-reminder-notification.ts';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://clairos:clairos_dev@localhost:5432/clairos';

/**
 * Configure Sidequest for queuing jobs.
 * This should be called on API startup.
 */
export async function configureSidequest() {
	try {
		await Sidequest.configure({
			backend: {
				driver: '@sidequest/postgres-backend',
				config: DATABASE_URL,
			},
		});
		console.log('✅ Sidequest configured');
	} catch (error) {
		console.error('Failed to configure Sidequest:', error);
	}
}

/**
 * Initialize and start the Sidequest job processor.
 * This should be called in the dedicated worker process.
 */
export async function startJobProcessor() {
	try {
		await Sidequest.start();

		console.log('🎯 Sidequest job processor started');

		// Schedule the recurring reminder processor job
		// Run every minute to check for due reminders
		await Sidequest.build(ProcessDueRemindersJob)
			.schedule('* * * * *'); // Every minute

		console.log('📆 ProcessDueRemindersJob scheduled (every minute)');

		// In development, show dashboard URL
		if (process.env.NODE_ENV !== 'production') {
			console.log('📊 Sidequest Dashboard: http://localhost:8678');
		}
	} catch (error) {
		console.error('Failed to start Sidequest:', error);
		process.exit(1);
	}
}

/**
 * Gracefully stop the job processor.
 * Should be called on API shutdown.
 */
export async function stopJobProcessor() {
	try {
		await Sidequest.stop();
		console.log('🛑 Sidequest job processor stopped');
	} catch (error) {
		console.error('Error stopping Sidequest:', error);
	}
}
