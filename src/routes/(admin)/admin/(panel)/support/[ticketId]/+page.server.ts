// Tipos
import type { Actions, PageServerLoad } from './$types';

// Svelte
import { fail } from '@sveltejs/kit';

// Servidor
import { getSupportThread, replySupport } from '$lib/server/api/panel-support';
import { failWith, orFail, panelContext } from '$lib/server/context';

// Dominio
import { supportReplySchema } from '$lib/schemas/support';

export const load: PageServerLoad = async (event) => {
	const ctx = panelContext(event);

	return { thread: orFail(await getSupportThread(ctx, event.params.ticketId)) };
};

export const actions: Actions = {
	reply: async (event) => {
		const ctx = panelContext(event);
		const formData = await event.request.formData();

		const parsed = supportReplySchema.safeParse({ body: formData.get('body') });

		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues.at(0)?.message ?? 'Escribe tu mensaje.' });
		}

		const result = await replySupport(ctx, event.params.ticketId, parsed.data.body);

		if (!result.ok) return failWith(result);

		return { message: 'Respuesta enviada.' };
	}
};
