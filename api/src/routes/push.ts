import { Hono } from 'hono';
import webpush from 'web-push';
import { db } from '../db/index.ts';
import { pushSubscriptions } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { Config } from '../config.ts';
import { requireAuth } from '../auth/index.ts';

const pushRouter = new Hono<{ Variables: { user: { id: string } } }>();

// Initialize web-push
webpush.setVapidDetails(
	Config.VAPID_SUBJECT,
	Config.VAPID_PUBLIC_KEY,
	Config.VAPID_PRIVATE_KEY
);

// Get VAPID public key
pushRouter.get('/key', (c) => {
	return c.json({ publicKey: Config.VAPID_PUBLIC_KEY });
});

// Subscribe to push notifications
pushRouter.post('/subscribe', requireAuth, async (c) => {
	const user = c.get('user');
	if (!user) return c.json({ error: 'Unauthorized' }, 401);

	const subscription = await c.req.json();

	if (!subscription || !subscription.endpoint || !subscription.keys) {
		return c.json({ error: 'Invalid subscription object' }, 400);
	}

	try {
		// Save subscription to DB
		await db.insert(pushSubscriptions).values({
			userId: user.id,
			endpoint: subscription.endpoint,
			p256dh: subscription.keys.p256dh,
			auth: subscription.keys.auth,
			userAgent: c.req.header('user-agent'),
		}).onConflictDoUpdate({
			target: pushSubscriptions.endpoint,
			set: {
				userId: user.id,
				p256dh: subscription.keys.p256dh,
				auth: subscription.keys.auth,
				updatedAt: new Date(),
			}
		});

		return c.json({ success: true });
	} catch (error) {
		console.error('Error saving push subscription:', error);
		return c.json({ error: 'Failed to save subscription' }, 500);
	}
});

// Unsubscribe from push notifications
pushRouter.post('/unsubscribe', requireAuth, async (c) => {
	const user = c.get('user');
	if (!user) return c.json({ error: 'Unauthorized' }, 401);

	const { endpoint } = await c.req.json();
	if (!endpoint) return c.json({ error: 'Endpoint required' }, 400);

	try {
		await db.delete(pushSubscriptions)
			.where(and(
				eq(pushSubscriptions.userId, user.id),
				eq(pushSubscriptions.endpoint, endpoint)
			));

		return c.json({ success: true });
	} catch (error) {
		console.error('Error deleting push subscription:', error);
		return c.json({ error: 'Failed to delete subscription' }, 500);
	}
});

/**
 * Utility function to send a push notification to a user
 */
export async function sendPushNotification(userId: string, payload: { title: string; body: string; data?: any }) {
	const subscriptions = await db.query.pushSubscriptions.findMany({
		where: eq(pushSubscriptions.userId, userId),
	});

	const results = await Promise.allSettled(
		subscriptions.map(async (sub) => {
			try {
				await webpush.sendNotification(
					{
						endpoint: sub.endpoint,
						keys: {
							p256dh: sub.p256dh,
							auth: sub.auth,
						},
					},
					JSON.stringify(payload)
				);
			} catch (error: any) {
				// If subscription has expired or is invalid, remove it
				if (error.statusCode === 410 || error.statusCode === 404) {
					await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
				}
				throw error;
			}
		})
	);

	return results;
}

export { pushRouter };
