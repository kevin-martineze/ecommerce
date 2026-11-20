// Tipos
import type { ApiResult } from '$lib/server/api/client';
import type { PanelContext } from '$lib/server/context';
import type { NotificationInbox, StreamTicket } from '$lib/domain/notifications';

// Servidor
import {
	inboxQuery,
	inboxSchema,
	ticketSchema,
	unreadSchema
} from '$lib/server/api/notifications-common';
import { panelRequest } from '$lib/server/api/request';

/**
 * Avisos de quien trabaja en la tienda: `/stores/:storeId/notifications/*`.
 * Dueña y personal tienen cada una su bandeja.
 */

export function listNotifications(
	ctx: PanelContext,
	page: { before?: string | null; limit?: number } = {}
): Promise<ApiResult<NotificationInbox>> {
	return panelRequest(ctx, `/notifications${inboxQuery(page)}`, inboxSchema);
}

/** Sin `ids`, marca leída toda la bandeja. Devuelve los no leídos que quedan. */
export function markNotificationsRead(
	ctx: PanelContext,
	ids?: string[]
): Promise<ApiResult<number>> {
	return panelRequest(ctx, '/notifications/read', unreadSchema, {
		method: 'POST',
		body: ids ? { ids } : {}
	});
}

/** Ticket de 60 s para que el navegador abra el stream de esta tienda. */
export function streamTicket(ctx: PanelContext): Promise<ApiResult<StreamTicket>> {
	return panelRequest(ctx, '/notifications/stream-ticket', ticketSchema, {
		method: 'POST',
		body: {}
	});
}
