// Librerías
import { z } from 'zod';

// Dominio
import {
	parseNotification,
	type AppNotification,
	type NotificationInbox,
	type StreamTicket
} from '$lib/domain/notifications';

/**
 * Lo que devuelve la bandeja de avisos, en el panel y en la consola: la forma
 * es la misma, solo cambia la ruta.
 *
 * Cada aviso se lee con `parseNotification`, que es lo mismo que usa el
 * navegador con el stream. Uno de un tipo desconocido se descarta.
 */

export const inboxSchema = z
	.object({
		items: z.array(z.unknown()),
		unread: z.number().int().nonnegative(),
		nextBefore: z.string().nullable()
	})
	.transform((inbox): NotificationInbox => ({
		items: inbox.items
			.map(parseNotification)
			.filter((item): item is AppNotification => item !== null),
		unread: inbox.unread,
		next_before: inbox.nextBefore
	}));

export const unreadSchema = z
	.object({ unread: z.number().int().nonnegative() })
	.transform((result) => result.unread);

export const ticketSchema = z
	.object({ url: z.string().url(), ticket: z.string().min(1) })
	.transform((result): StreamTicket => ({ url: result.url, ticket: result.ticket }));

/** `?before=…&limit=…` de la bandeja. */
export function inboxQuery(page: { before?: string | null; limit?: number } = {}): string {
	const params = new URLSearchParams();

	if (page.before) params.set('before', page.before);
	if (page.limit) params.set('limit', String(page.limit));

	const query = params.toString();

	return query ? `?${query}` : '';
}

/** La llave VAPID para suscribirse. Null: la API no manda push. */
export const pushKeySchema = z
	.object({ publicKey: z.string().min(1).nullable() })
	.transform((result) => result.publicKey);
