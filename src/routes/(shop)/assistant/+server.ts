// Tipos
import type { RequestHandler } from './$types';

// Svelte
import { json } from '@sveltejs/kit';

// Servidor
import { askAssistant } from '$lib/server/api/assistant';
import { publicContext } from '$lib/server/context';

/**
 * El chat de la tienda, desde el navegador.
 *
 * Es un endpoint nuestro y no una form action porque un chat va y viene sin
 * recargar nada: no hay formulario que enviar ni página que actualizar. El
 * navegador sigue sin hablar con la API —habla con este servidor, que es quien
 * tiene el secreto compartido y la IP de quien pregunta—, que es lo que
 * importa de la regla.
 *
 * Lo que responde la API ya viene listo para mostrar. Si falla, se dice con
 * una frase y se ofrece WhatsApp: un chat que se queda mudo es peor que uno
 * que no existe.
 */
const MAX_TURNS = 12;
const MAX_LARGO = 500;

export const POST: RequestHandler = async (event) => {
	const body: unknown = await event.request.json().catch(() => null);
	const messages = readTurns(body);

	if (messages.length === 0) {
		return json({ reply: '¿En qué te ayudo?', handoff: false });
	}

	const result = await askAssistant(publicContext(event), messages);

	if (!result.ok) {
		return json({ reply: excuse(result.code), handoff: true });
	}

	return json(result.data);
};

function readTurns(body: unknown): { role: 'user' | 'assistant'; content: string }[] {
	if (typeof body !== 'object' || body === null) return [];

	const list = (body as { messages?: unknown }).messages;

	if (!Array.isArray(list)) return [];

	return list
		.filter(
			(turn): turn is { role: 'user' | 'assistant'; content: string } =>
				typeof turn === 'object' &&
				turn !== null &&
				(turn as { role?: unknown }).role !== undefined &&
				typeof (turn as { content?: unknown }).content === 'string'
		)
		.map((turn) => ({
			role: turn.role === 'assistant' ? ('assistant' as const) : ('user' as const),
			content: turn.content.slice(0, MAX_LARGO)
		}))
		.slice(-MAX_TURNS);
}

/** Qué se dice cuando no hay respuesta. Nunca el error técnico. */
function excuse(code: string): string {
	if (code === 'plan_limit') {
		return 'Por hoy no puedo seguir respondiendo por acá. Escríbenos por WhatsApp y te atendemos.';
	}

	return 'No pude responder eso. Escríbenos por WhatsApp y te ayuda alguien del equipo.';
}
