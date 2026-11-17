// Tipos
import type { Actions, PageServerLoad } from './$types';

// Svelte
import { error, fail, redirect } from '@sveltejs/kit';

// Servidor
import { changePassword, me, switchStore } from '$lib/server/api/auth';
import {
	accountContext,
	clientAddress,
	displayStatus,
	failWith,
	orFail,
	panelContext,
	storeUrl
} from '$lib/server/context';
import { parseForm } from '$lib/server/form';
import { toAdminSession, writeSession } from '$lib/server/session';

// Dominio
import { changePasswordSchema } from '$lib/schemas/account';

export const load: PageServerLoad = async (event) => {
	const ctx = panelContext(event);
	const account = orFail(await me(ctx.accessToken, clientAddress(event)));

	return {
		user: { email: account.user.email, full_name: account.user.fullName },
		activeStoreId: ctx.storeId,
		stores: account.stores.map((store) => ({ ...store, url: storeUrl(store.slug) }))
	};
};

export const actions: Actions = {
	password: async (event) => {
		const ctx = accountContext(event);
		const session = event.locals.session;

		if (!session) redirect(303, '/admin/login');

		const form = await parseForm(event, changePasswordSchema);

		if (!form.ok) return form.failure;

		const result = await changePassword(ctx, {
			currentPassword: form.data.currentPassword,
			newPassword: form.data.password,
			refreshToken: session.refreshToken
		});

		// Un 401 aquí es la contraseña actual equivocada, no una sesión vencida.
		if (!result.ok) return fail(displayStatus(result), { error: result.message });

		return { message: 'Contraseña cambiada. Cerramos tus otras sesiones.' };
	},

	switchStore: async (event) => {
		const ctx = accountContext(event);
		const session = event.locals.session;

		if (!session) redirect(303, '/admin/login');

		const formData = await event.request.formData();
		const storeId = String(formData.get('storeId') ?? '');

		if (!storeId) error(400, 'Elige una tienda.');

		const result = await switchStore(ctx, storeId, session.refreshToken);

		if (!result.ok) return failWith(result);

		writeSession(event.cookies, toAdminSession(result.data));
		redirect(303, '/admin');
	}
};
