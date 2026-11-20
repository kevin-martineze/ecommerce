// Tipos
import type { Actions, PageServerLoad } from './$types';

// Svelte
import { redirect } from '@sveltejs/kit';

// Servidor
import { listNotifications, markNotificationsRead } from '$lib/server/api/panel-notifications';
import { failWith, orFail, panelContext } from '$lib/server/context';
import { parseForm } from '$lib/server/form';

// Dominio
import { openNotificationSchema } from '$lib/schemas/notifications';

// Utilidades
import { safeRedirectTarget } from '$lib/utils/redirect';

const BASE_PATH = '/admin/notifications';

export const load: PageServerLoad = async (event) => {
	const before = event.url.searchParams.get('before');

	return {
		inbox: orFail(await listNotifications(panelContext(event), { before })),
		before
	};
};

export const actions: Actions = {
	/** Tocar un aviso: lo marca leído y lleva a su detalle. */
	read: async (event) => {
		const ctx = panelContext(event);
		const form = await parseForm(event, openNotificationSchema);

		if (!form.ok) return form.failure;

		// Si no se pudo marcar, igual se abre: lo que la dueña quería era verlo.
		await markNotificationsRead(ctx, [form.data.id]);

		redirect(303, safeRedirectTarget(form.data.href, BASE_PATH));
	},

	readAll: async (event) => {
		const result = await markNotificationsRead(panelContext(event));

		if (!result.ok) return failWith(result);

		return { message: 'Marcamos todo como leído.' };
	}
};
