/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Dominio
import { notificationHref, notificationText, parseNotification } from '$lib/domain/notifications';

/**
 * El service worker del panel y la consola. Hace dos cosas y nada más:
 *
 * - **`push`**: la API manda el mismo aviso de la bandeja (sin datos de
 *   clientas) y acá se arma el texto con `notificationText`, igual que la
 *   campana.
 * - **`notificationclick`**: enfoca una pestaña del sitio y la lleva al
 *   detalle, o abre una.
 *
 * No guarda nada en caché: la app sigue saliendo de la red como siempre.
 */

declare const self: ServiceWorkerGlobalScope;

self.addEventListener('install', () => {
	void self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
	const notification = parseNotification(readJson(event.data));

	// Un aviso de un tipo que este sitio todavía no conoce igual se muestra:
	// el navegador castiga a quien recibe un push y no muestra nada.
	const { title, body } = notification
		? notificationText(notification)
		: { title: 'Globerce', body: 'Tienes una notificación nueva.' };
	const url = notification ? notificationHref(notification) : '/admin/notifications';

	event.waitUntil(
		self.registration.showNotification(title, {
			body,
			icon: '/apple-touch-icon.png',
			badge: '/favicon.png',
			tag: notification?.id,
			data: { url }
		})
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();

	const target = new URL(readUrl(event.notification.data), self.location.origin);

	event.waitUntil(focusOrOpen(target));
});

async function focusOrOpen(target: URL): Promise<void> {
	// Solo rutas de este sitio: el aviso nunca lleva a otro lado.
	if (target.origin !== self.location.origin) return;

	const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

	for (const client of windows) {
		if (new URL(client.url).origin === target.origin && 'focus' in client) {
			const focused = await client.focus();

			await focused.navigate(target.href);

			return;
		}
	}

	await self.clients.openWindow(target.href);
}

function readJson(data: PushMessageData | null): unknown {
	try {
		return data?.json() ?? null;
	} catch {
		return null;
	}
}

function readUrl(data: unknown): string {
	if (typeof data === 'object' && data !== null && 'url' in data && typeof data.url === 'string') {
		return data.url;
	}

	return '/admin/notifications';
}
