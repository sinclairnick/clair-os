import { api } from './api';

/**
 * Utility to convert base64 VAPID key to a Uint8Array
 */
function urlBase64ToUint8Array(base64String: string) {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

export const pushManager = {
	async isSupported() {
		return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
	},

	async getSubscription() {
		const registration = await navigator.serviceWorker.ready;
		return await registration.pushManager.getSubscription();
	},

	async getStatus(): Promise<'unsupported' | 'unsubscribed' | 'subscribed' | 'denied'> {
		if (!(await this.isSupported())) return 'unsupported';
		if (Notification.permission === 'denied') return 'denied';

		const subscription = await this.getSubscription();
		return subscription ? 'subscribed' : 'unsubscribed';
	},

	async subscribe() {
		try {
			// 1. Get Public Key from server
			const { publicKey: vapidPublicKey } = await api.push.getPublicKey();
			const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

			// 2. Request permission
			const permission = await Notification.requestPermission();
			if (permission !== 'granted') {
				throw new Error('Permission not granted for notifications');
			}

			// 3. Subscribe with the Push Service
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: convertedVapidKey,
			});

			// 4. Send subscription to our backend
			const subJson = subscription.toJSON();
			await api.push.subscribe(subJson);

			return subscription;
		} catch (error) {
			console.error('Subscription failed:', error);
			throw error;
		}
	},

	async unsubscribe() {
		try {
			const subscription = await this.getSubscription();
			if (subscription) {
				// 1. Tell our backend to remove it
				await api.push.unsubscribe(subscription.endpoint);
				// 2. Unsubscribe from the browser's push manager
				await subscription.unsubscribe();
			}
			return true;
		} catch (error) {
			console.error('Unsubscription failed:', error);
			throw error;
		}
	}
};
