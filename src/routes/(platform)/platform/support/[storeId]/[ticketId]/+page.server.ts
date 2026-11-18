// Tipos
import type { Actions, PageServerLoad } from './$types';

// Svelte
import { fail } from '@sveltejs/kit';

// Servidor
import {
	getPlatformThread,
	replyPlatformSupport,
	setPlatformSupportStatus
} from '$lib/server/api/platform-support';
import { accountContext, failWith, orFail } from '$lib/server/context';
import { parseForm } from '$lib/server/form';

// Dominio
import { supportReplySchema, supportStatusSchema } from '$lib/schemas/support';

export const load: PageServerLoad = async (event) => {
	const ctx = accountContext(event);
	const { storeId, ticketId } = event.params;

	return { thread: orFail(await getPlatformThread(ctx, storeId, ticketId)) };
};

export const actions: Actions = {
	reply: async (event) => {
		const ctx = accountContext(event);
		const form = await parseForm(event, supportReplySchema);

		if (!form.ok) return form.failure;

		const result = await replyPlatformSupport(
			ctx,
			event.params.storeId,
			event.params.ticketId,
			form.data.body
		);

		if (!result.ok) return failWith(result);

		return { message: 'Respuesta enviada.' };
	},

	status: async (event) => {
		const ctx = accountContext(event);
		const formData = await event.request.formData();
		const status = supportStatusSchema.safeParse(formData.get('status'));

		if (!status.success) {
			return fail(400, { error: status.error.issues.at(0)?.message ?? 'Ese estado no existe.' });
		}

		const result = await setPlatformSupportStatus(
			ctx,
			event.params.storeId,
			event.params.ticketId,
			status.data
		);

		if (!result.ok) return failWith(result);

		return { message: 'Estado del ticket actualizado.' };
	}
};
