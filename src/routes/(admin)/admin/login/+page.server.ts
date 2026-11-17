// Tipos
import type { Actions, PageServerLoad } from './$types';

// Svelte
import { fail, redirect } from '@sveltejs/kit';

// Servidor
import { login, logout, me, switchStore } from '$lib/server/api/auth';
import { clientAddress, displayStatus, storeSlugFor } from '$lib/server/context';
import { parseForm } from '$lib/server/form';
import { toAdminSession, writeSession } from '$lib/server/session';

// Dominio
import { loginSchema } from '$lib/schemas/admin';

// Utilidades
import { safeRedirectTarget } from '$lib/utils/redirect';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.session) redirect(303, safeRedirectTarget(url.searchParams.get('redirectTo')));

	return { notice: url.searchParams.get('notice') ?? url.searchParams.get('error') };
};

export const actions: Actions = {
	default: async (event) => {
		const { request, cookies, url } = event;
		const form = await parseForm({ request }, loginSchema);

		if (!form.ok) return form.failure;

		const ip = clientAddress(event);
		const result = await login(form.data.email, form.data.password, ip);

		if (!result.ok) {
			// Los 4xx (credenciales, cuenta bloqueada, demasiados intentos) traen
			// un mensaje ya escrito para la dueña. Lo demás es la red o nosotros.
			return fail(displayStatus(result), { error: result.message });
		}

		let session = toAdminSession(result.data);

		// En el subdominio de una tienda se entra a ESA tienda, si la cuenta es
		// parte de ella, aunque la API haya elegido otra.
		const hostSlug = storeSlugFor(event);
		const hostStore = result.data.stores.find((store) => store.slug === hostSlug);

		if (hostStore && hostStore.id !== session.storeId) {
			const switched = await switchStore(
				{ accessToken: session.accessToken, clientIp: ip },
				hostStore.id,
				session.refreshToken
			);

			if (switched.ok) session = toAdminSession(switched.data);
		}

		if (!session.storeId) {
			// Sin tienda solo se entra a la consola de la plataforma.
			const account = await me(session.accessToken, ip);

			if (account.ok && account.data.isPlatformAdmin) {
				writeSession(cookies, session);
				redirect(303, '/platform');
			}

			await logout(session.refreshToken, ip);

			return fail(403, { error: 'Esta cuenta no tiene acceso al panel.' });
		}

		writeSession(cookies, session);

		redirect(303, safeRedirectTarget(url.searchParams.get('redirectTo')));
	}
};
