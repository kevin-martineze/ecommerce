// Tipos
import type { Actions, PageServerLoad } from './$types';

// Servidor
import { getSupportThread, replySupport } from '$lib/server/api/panel-support';
import { failWith, orFail, panelContext } from '$lib/server/context';
import { parseForm } from '$lib/server/form';

// Dominio
import { supportReplySchema } from '$lib/schemas/support';

export const load: PageServerLoad = async (event) => {
	const ctx = panelContext(event);

	return { thread: orFail(await getSupportThread(ctx, event.params.ticketId)) };
};

export const actions: Actions = {
	reply: async (event) => {
		const ctx = panelContext(event);
		const form = await parseForm(event, supportReplySchema);

		if (!form.ok) return form.failure;

		const result = await replySupport(ctx, event.params.ticketId, form.data.body);

		if (!result.ok) return failWith(result);

		return { message: 'Respuesta enviada.' };
	}
};
