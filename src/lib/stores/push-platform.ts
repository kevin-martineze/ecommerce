// Tipos
import type { PushPlatform } from '$lib/stores/push-device.svelte';
import type { PushDeviceSubscription } from '$lib/domain/notifications';

// App
import { dev } from '$app/environment';

/**
 * `PushPlatform` sobre las APIs del navegador: service worker, Push API,
 * permisos de notificación y `localStorage`.
 */
export function browserPushPlatform(): PushPlatform {
	return {
		supported: () =>
			'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
		needsInstall: () => isAppleMobile() && !isInstalled(),
		permission: () => Notification.permission,
		requestPermission: () => Notification.requestPermission(),
		current: async () => {
			const registration = await navigator.serviceWorker.getRegistration('/');
			const subscription = await registration?.pushManager.getSubscription();

			return subscription ? readSubscription(subscription) : null;
		},
		subscribe: async (publicKey) => {
			await navigator.serviceWorker.register('/service-worker.js', {
				// En desarrollo Vite sirve el worker como módulo.
				type: dev ? 'module' : 'classic',
				scope: '/'
			});

			const registration = await navigator.serviceWorker.ready;
			const key = base64UrlToBytes(publicKey);
			const existing = await registration.pushManager.getSubscription();

			if (existing && sameKey(existing.options.applicationServerKey, key)) {
				return readSubscription(existing);
			}

			// Suscrita con otra llave (la API cambió de llaves): esa ya no sirve.
			await existing?.unsubscribe();

			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: key
			});

			return readSubscription(subscription);
		},
		read: (key) => {
			try {
				return localStorage.getItem(key);
			} catch {
				return null;
			}
		},
		write: (key, value) => {
			try {
				if (value === null) localStorage.removeItem(key);
				else localStorage.setItem(key, value);
			} catch {
				// Sin almacenamiento (modo privado): el botón vuelve a «activar».
			}
		}
	};
}

function readSubscription(subscription: PushSubscription): PushDeviceSubscription {
	const json = subscription.toJSON();
	const p256dh = json.keys?.p256dh;
	const auth = json.keys?.auth;

	if (!json.endpoint || !p256dh || !auth) {
		throw new Error('La suscripción del navegador no trae sus llaves.');
	}

	return { endpoint: json.endpoint, keys: { p256dh, auth } };
}

/** iPhone o iPad. El iPad moderno dice ser un Mac, pero tiene pantalla táctil. */
function isAppleMobile(): boolean {
	return (
		/iPhone|iPad|iPod/.test(navigator.userAgent) ||
		(navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
	);
}

function isInstalled(): boolean {
	return window.matchMedia('(display-mode: standalone)').matches;
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
	const base64 = (value + '='.repeat((4 - (value.length % 4)) % 4))
		.replaceAll('-', '+')
		.replaceAll('_', '/');
	const binary = atob(base64);
	const bytes = new Uint8Array(new ArrayBuffer(binary.length));

	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}

	return bytes;
}

function sameKey(current: ArrayBuffer | null, expected: Uint8Array): boolean {
	if (!current || current.byteLength !== expected.length) return false;

	const bytes = new Uint8Array(current);

	return bytes.every((byte, index) => byte === expected[index]);
}
