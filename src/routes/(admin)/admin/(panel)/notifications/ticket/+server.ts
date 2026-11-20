// Tipos
import type { RequestHandler } from './$types';

// Svelte
import { error, json } from '@sveltejs/kit';

// Servidor
import { streamTicket } from '$lib/server/api/panel-notifications';
import { displayStatus, panelContext } from '$lib/server/context';

/**
 * Ticket para que el navegador abra el stream de avisos de esta tienda.
 *
 * El stream es lo único que el navegador abre directo contra la API (en Vercel,
 * una conexión larga por pestaña ocuparía una función todo el rato), y
 * `EventSource` no puede mandar el token de la sesión. Así que el navegador le
 * pide a ESTE servidor un ticket de 60 s que solo sirve para abrir el stream.
 *
 * POST y sin caché: emite una credencial, no se puede precargar ni reutilizar.
 * Quién puede pedirlo lo decide la API, que verifica la membresía.
 */
export const POST: RequestHandler = async (event) => {
	const result = await streamTicket(panelContext(event));

	if (!result.ok) error(displayStatus(result), result.message);

	return json(result.data, { headers: { 'cache-control': 'no-store' } });
};
