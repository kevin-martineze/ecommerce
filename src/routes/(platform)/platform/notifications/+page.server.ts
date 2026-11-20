// Tipos
import type { Actions, PageServerLoad } from './$types';

// Svelte
import { redirect } from '@sveltejs/kit';

// Servidor
import {
	listPlatformNotifications,
	markPlatformNotificationsRead
} from '$lib/server/api/platform-notifications';
import { accountContext, failWith, orFail } from '$lib/server/context';
import { parseForm } from '$lib/server/form';

// Dominio
import { openNotificationSchema } from '$lib/schemas/notifications';

// Utilidades
import { safeRedirectTarget } from '$lib/utils/redirect';

const BASE_PATH = '/platform/notifications';

export const load: PageServerLoad = async (event) => {
	const before = event.url.searchParams.get('before');

	return {
		inbox: orFail(await listPlatformNotifications(accountContext(event), { before })),
		before
	};
};

// Los permisos los decide la API: una cuenta que no administra la plataforma
// recibe 403 en cada llamada, aunque las actions no pasen por el layout.
export const actions: Actions = {
	/** Tocar un aviso: lo marca leído y lleva a su detalle. */
	read: async (event) => {
		const ctx = accountContext(event);
		const form = await parseForm(event, openNotificationSchema);

		if (!form.ok) return form.failure;

		// Si no se pudo marcar, igual se abre: lo que se quería era verlo.
		await markPlatformNotificationsRead(ctx, [form.data.id]);

		redirect(303, safeRedirectTarget(form.data.href, BASE_PATH));
	},

	readAll: async (event) => {
		const result = await markPlatformNotificationsRead(accountContext(event));

		if (!result.ok) return failWith(result);

		return { message: 'Marcamos todo como leído.' };
	}
};
