// Tipos
import type { ApiResult, ResponseSchema } from '$lib/server/api/client';
import type { AccountContext } from '$lib/server/context';
import type { NotificationInbox, StreamTicket } from '$lib/domain/notifications';

// Servidor
import { apiRequest } from '$lib/server/api/client';
import {
	inboxQuery,
	inboxSchema,
	ticketSchema,
	unreadSchema
} from '$lib/server/api/notifications-common';

// Dominio
import { EMPTY_INBOX } from '$lib/domain/notifications';

/** Avisos de la consola: `/platform/notifications/*`. Solo administradores de la plataforma. */

function platformRequest<T>(
	ctx: AccountContext,
	path: string,
	schema: ResponseSchema<T>,
	options: { method?: 'GET' | 'POST'; body?: unknown } = {}
): Promise<ApiResult<T>> {
	return apiRequest(`/platform/notifications${path}`, schema, {
		...options,
		accessToken: ctx.accessToken,
		clientIp: ctx.clientIp
	});
}

export function listPlatformNotifications(
	ctx: AccountContext,
	page: { before?: string | null; limit?: number } = {}
): Promise<ApiResult<NotificationInbox>> {
	return platformRequest(ctx, inboxQuery(page), inboxSchema);
}

export function markPlatformNotificationsRead(
	ctx: AccountContext,
	ids?: string[]
): Promise<ApiResult<number>> {
	return platformRequest(ctx, '/read', unreadSchema, {
		method: 'POST',
		body: ids ? { ids } : {}
	});
}

export function platformStreamTicket(ctx: AccountContext): Promise<ApiResult<StreamTicket>> {
	return platformRequest(ctx, '/stream-ticket', ticketSchema, { method: 'POST', body: {} });
}

/** La campana de la consola: los últimos avisos, o una bandeja vacía si la API falla. */
export async function platformNotificationsPreview(
	ctx: AccountContext
): Promise<NotificationInbox> {
	const result = await listPlatformNotifications(ctx, { limit: 20 });

	return result.ok ? result.data : EMPTY_INBOX;
}
