// Tipos
import type { ApiFailure } from '$lib/server/api/client';
import type { FieldErrors } from '$lib/utils/form';
import type { Actions, PageServerLoad } from './$types';

// Svelte
import { fail, redirect } from '@sveltejs/kit';

// Servidor
import { createStore, register, registerWithGoogle } from '$lib/server/api/auth';
import { listPublicPlans } from '$lib/server/api/plans';
import { accountContext, clientAddress, displayStatus } from '$lib/server/context';
import { serverEnv } from '$lib/server/env';
import { clearGoogleSignup, googleStartHref, readGoogleSignup } from '$lib/server/google-signin';
import { toAdminSession, writeSession } from '$lib/server/session';

// Dominio
import { GOOGLE_NOTICE_CODES, GOOGLE_NOTICES } from '$lib/domain/google-auth';
import { joinPhone } from '$lib/domain/phone';
import {
	googleRegisterSchema,
	planCodeSchema,
	registerSchema,
	storeFieldsSchema
} from '$lib/schemas/account';

// Utilidades
import { fieldErrors } from '$lib/utils/form';

export const load: PageServerLoad = async (event) => {
	const rootDomain = serverEnv().PUBLIC_STORE_ROOT_DOMAIN;
	const ip = clientAddress(event);
	const plans = await listPublicPlans(ip);
	// Sin planes se registra igual y la API pone el básico: no poder mostrar los
	// precios no puede ser motivo para no dejar abrir la tienda.
	const availableItems = plans.ok ? plans.data : [];
	const order = event.url.searchParams.get('plan');
	const signedIn = event.locals.session !== null;
	const withGoogle = !signedIn && event.url.searchParams.get('with') === 'google';
	const signup = withGoogle ? readGoogleSignup(event.cookies) : null;

	return {
		// Con sesión se crea una tienda más para esa cuenta: no se piden sus datos.
		signedIn,
		// Solo el nombre y el correo: el `signupToken` no sale de la cookie.
		google: signup ? { email: signup.email, fullName: signup.fullName } : null,
		googleHref: signedIn || signup ? null : googleStartHref(event.url, 'signup'),
		notice:
			withGoogle && !signup
				? GOOGLE_NOTICE_CODES.signupExpired
				: event.url.searchParams.get('error'),
		addressSuffix: rootDomain ? `.${rootDomain}` : null,
		plans: availableItems,
		// El que venía de la página de precios; si no, el primero de la lista.
		selectedPlan:
			availableItems.find((plan) => plan.code === order)?.code ?? availableItems[0]?.code
	};
};

/**
 * Un choque de la API va bajo el campo que lo causó; lo demás, arriba del
 * formulario. Se decide por el código y no por el texto, que cambia.
 */
function apiError(result: ApiFailure): { error?: string; errors?: FieldErrors } {
	if (result.code === 'email_taken') return { errors: { email: result.message } };
	if (result.code === 'slug_taken') return { errors: { storeSlug: result.message } };

	return { error: result.message };
}

export const actions: Actions = {
	default: async (event) => {
		const { request, cookies, locals, url } = event;
		const formData = await request.formData();
		const ip = clientAddress(event);
		const text = (field: string) => String(formData.get(field) ?? '');

		const fields = {
			storeName: text('storeName'),
			storeSlug: text('storeSlug'),
			// El indicativo llega en su propio campo: pegarlo en el cliente
			// obligaría a un input oculto, que sin JavaScript no se actualiza.
			whatsappPhone: joinPhone(text('whatsappPhoneCountry'), text('whatsappPhone')),
			fullName: text('fullName'),
			email: text('email'),
			password: text('password'),
			confirm: text('confirm')
		};

		// Un plan que no exista no frena el registro: la API cae en el básico y la
		// tienda lo cambia después desde su panel.
		const plan = planCodeSchema.safeParse(formData.get('planCode'));
		const planCode = plan.success ? plan.data : undefined;

		// Lo tecleado vuelve a la página para no perderlo si algo falla. Las
		// contraseñas no: no viajan de vuelta ni para eso.
		const values = {
			storeName: fields.storeName,
			storeSlug: fields.storeSlug,
			whatsappPhone: fields.whatsappPhone,
			fullName: fields.fullName,
			email: fields.email,
			planCode
		};

		if (locals.session) {
			const parsed = storeFieldsSchema.safeParse(fields);

			if (!parsed.success) {
				return fail(400, { errors: fieldErrors(parsed.error), values });
			}

			const result = await createStore(
				accountContext(event),
				{ ...parsed.data, planCode },
				locals.session.refreshToken
			);

			if (!result.ok) return fail(displayStatus(result), { ...apiError(result), values });

			const session = toAdminSession(result.data);

			writeSession(cookies, session);

			// La tienda ya existe; lo primero que se elige es con qué se viste.
			redirect(303, '/admin/welcome');
		}

		if (url.searchParams.get('with') === 'google') {
			const signup = readGoogleSignup(cookies);

			if (!signup) {
				return fail(400, { error: GOOGLE_NOTICES[GOOGLE_NOTICE_CODES.signupExpired], values });
			}

			// Sin nombre de Google, la dueña lo escribe; con él, no se toca.
			const parsed = googleRegisterSchema(!signup.fullName).safeParse(fields);

			if (!parsed.success) {
				return fail(400, { errors: fieldErrors(parsed.error), values });
			}

			const result = await registerWithGoogle(
				{ signupToken: signup.signupToken, ...parsed.data, planCode },
				ip
			);

			if (!result.ok) {
				// El token venció o ya no vale: no sirve de nada volver a intentarlo.
				if (result.code === 'signup_token_invalid') clearGoogleSignup(cookies);

				// El correo lo dio Google y no se puede cambiar aquí: su choque va
				// arriba del formulario y no bajo un campo de solo lectura.
				const failure =
					result.code === 'email_taken' ? { error: result.message } : apiError(result);

				return fail(displayStatus(result), { ...failure, values });
			}

			clearGoogleSignup(cookies);
			writeSession(cookies, toAdminSession(result.data));
			redirect(303, '/admin/welcome');
		}

		const parsed = registerSchema.safeParse(fields);

		if (!parsed.success) {
			return fail(400, { errors: fieldErrors(parsed.error), values });
		}

		const result = await register(
			{
				storeName: parsed.data.storeName,
				storeSlug: parsed.data.storeSlug,
				whatsappPhone: parsed.data.whatsappPhone,
				fullName: parsed.data.fullName,
				email: parsed.data.email,
				password: parsed.data.password,
				planCode
			},
			ip
		);

		if (!result.ok) return fail(displayStatus(result), { ...apiError(result), values });

		const session = toAdminSession(result.data);

		writeSession(cookies, session);
		redirect(303, '/admin/welcome');
	}
};
