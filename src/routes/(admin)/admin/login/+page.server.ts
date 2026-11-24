// Tipos
import type { Actions, PageServerLoad } from './$types';

// Svelte
import { fail, redirect } from '@sveltejs/kit';

// Servidor
import { login } from '$lib/server/api/auth';
import { completeSignIn } from '$lib/server/auth';
import { clientAddress, displayStatus, storeSlugFor } from '$lib/server/context';
import { parseForm } from '$lib/server/form';
import { googleStartHref } from '$lib/server/google-signin';
import { movedStoreLocation } from '$lib/server/moved-store';

// Dominio
import { GOOGLE_NOTICE_CODES, GOOGLE_NOTICES } from '$lib/domain/google-auth';
import { loginSchema } from '$lib/schemas/admin';

// Utilidades
import { safeRedirectTarget } from '$lib/utils/redirect';

export const load: PageServerLoad = async (event) => {
	const { locals, url } = event;
	const redirectTo = url.searchParams.get('redirectTo');

	if (locals.session) redirect(303, safeRedirectTarget(redirectTo));

	// En el subdominio que la tienda dejó, se entra por el nuevo: la sesión
	// queda en el host donde la dueña va a trabajar.
	const moved = await movedStoreLocation(event);

	if (moved) redirect(308, moved);

	return {
		notice: url.searchParams.get('notice') ?? url.searchParams.get('error'),
		// Solo se pasa adelante si es una ruta nuestra: el botón no puede ser
		// la puerta para un redirector abierto.
		googleHref: googleStartHref(url, 'login', redirectTo ? safeRedirectTarget(redirectTo) : null)
	};
};

export const actions: Actions = {
	default: async (event) => {
		const { request, cookies, url } = event;
		const form = await parseForm({ request }, loginSchema);

		if (!form.ok) return form.failure;

		const ip = clientAddress(event);
		const result = await login(form.data.email, form.data.password, ip);

		if (!result.ok) {
			// Una cuenta creada con Google no tiene contraseña: se le dice por
			// dónde entrar, con el nombre del botón que tiene enfrente.
			if (result.code === GOOGLE_NOTICE_CODES.useGoogle) {
				return fail(401, { error: GOOGLE_NOTICES[GOOGLE_NOTICE_CODES.useGoogle] });
			}

			// Los 4xx (credenciales, cuenta bloqueada, demasiados intentos) traen
			// un mensaje ya escrito para la dueña. Lo demás es la red o nosotros.
			return fail(displayStatus(result), { error: result.message });
		}

		const outcome = await completeSignIn(cookies, result.data, storeSlugFor(event), ip);

		if (!outcome.ok) return fail(outcome.status, { error: outcome.error });
		if (outcome.destination === 'platform') redirect(303, '/platform');

		redirect(303, safeRedirectTarget(url.searchParams.get('redirectTo')));
	}
};
