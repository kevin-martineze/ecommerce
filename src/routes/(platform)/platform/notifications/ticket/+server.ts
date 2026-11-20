// Tipos
import type { RequestHandler } from './$types';

// Svelte
import { error, json } from '@sveltejs/kit';

// Servidor
import { platformStreamTicket } from '$lib/server/api/platform-notifications';
import { accountContext, displayStatus } from '$lib/server/context';

/**
 * Ticket para que el navegador abra el stream de avisos de la consola. Mismo
 * porqué que el del panel (`/admin/notifications/ticket`). Que la cuenta
 * administre la plataforma lo verifica la API.
 */
export const POST: RequestHandler = async (event) => {
	const result = await platformStreamTicket(accountContext(event));

	if (!result.ok) error(displayStatus(result), result.message);

	return json(result.data, { headers: { 'cache-control': 'no-store' } });
};
