// Tipos
import type { Actions, PageServerLoad } from './$types';

// Svelte
import { redirect } from '@sveltejs/kit';

// Servidor
import {
	listNotifications,
	markNotificationsRead,
	pushKey,
	subscribePush,
	unsubscribePush
} from '$lib/server/api/panel-notifications';
import { failWith, orFail, panelContext } from '$lib/server/context';
import { parseForm } from '$lib/server/form';

// Dominio
import { openNotificationSchema, pushOffSchema, pushOnSchema } from '$lib/schemas/notifications';

// Utilidades
import { safeRedirectTarget } from '$lib/utils/redirect';

const BASE_PATH = '/admin/notifications';

export const load: PageServerLoad = async (event) => {
	const before = event.url.searchParams.get('before');

	const ctx = panelContext(event);
	const [inbox, key] = await Promise.all([listNotifications(ctx, { before }), pushKey(ctx)]);

	return {
		inbox: orFail(inbox),
		before,
		// Sin push en la API, la página no ofrece activarlo.
		pushKey: key.ok ? key.data : null,
		pushScope: `store:${ctx.storeId}`
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
	},

	/** Este dispositivo recibe las notificaciones por push. */
	pushOn: async (event) => {
		const ctx = panelContext(event);
		const form = await parseForm(event, pushOnSchema);

		if (!form.ok) return form.failure;

		const result = await subscribePush(ctx, form.data);

		if (!result.ok) return failWith(result);

		return { message: 'Listo: te avisaremos en este dispositivo.' };
	},

	pushOff: async (event) => {
		const ctx = panelContext(event);
		const form = await parseForm(event, pushOffSchema);

		if (!form.ok) return form.failure;

		const result = await unsubscribePush(ctx, form.data.endpoint);

		if (!result.ok) return failWith(result);

		return { message: 'Ya no te avisaremos en este dispositivo.' };
	}
};
