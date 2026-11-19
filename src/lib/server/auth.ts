// Tipos
import type { Cookies, RequestEvent } from '@sveltejs/kit';
import type { ApiMe, ApiSession, ApiSessionStore } from '$lib/server/api/auth';
import type { AdminSession } from '$lib/server/session-crypto';

// Svelte
import { error, redirect } from '@sveltejs/kit';

// Servidor
import { logout, me, switchStore } from '$lib/server/api/auth';
import { accountContext, clientAddress, storeSlugFor } from '$lib/server/context';
import { clearSession, toAdminSession, writeSession } from '$lib/server/session';

/** El código con que la API rechaza una cuenta deshabilitada (403). */
export const ACCOUNT_DISABLED = 'account_disabled';

type GuardEvent = Pick<RequestEvent, 'locals' | 'cookies' | 'url' | 'getClientAddress'>;

export interface PanelAccess {
	account: ApiMe;
	/** La tienda activa, con el rol que la cuenta tiene en ella. */
	store: ApiSessionStore;
}

function loginUrl(event: GuardEvent): string {
	return `/admin/login?redirectTo=${encodeURIComponent(event.url.pathname)}`;
}

/** La cuenta de la sesión según la API, o redirige/falla si la sesión ya no sirve. */
async function currentAccount(event: GuardEvent, session: AdminSession): Promise<ApiMe> {
	const result = await me(session.accessToken, clientAddress(event));

	if (result.ok) return result.data;

	if (result.status === 401) {
		clearSession(event.cookies);
		redirect(303, loginUrl(event));
	}

	// La plataforma deshabilitó la cuenta: la sesión no sirve más y el login
	// dice por qué, en vez de mostrar un error genérico en cada página.
	if (result.code === ACCOUNT_DISABLED) {
		clearSession(event.cookies);
		redirect(303, `/admin/login?error=${ACCOUNT_DISABLED}`);
	}

	// La API no respondió o falló: no es motivo para cerrar la sesión.
	error(503, result.message);
}

/**
 * Exige sesión del panel y que la membresía en su tienda siga viva.
 *
 * La cookie sola no alcanza: prueba que la dueña entró, no que siga teniendo
 * acceso. Se le pregunta a la API en cada carga del panel, así quitarle el
 * acceso a alguien surte efecto en la siguiente página y no cuando venza su
 * token.
 *
 * Si el host es el de otra tienda de la misma cuenta, cambia la sesión a esa
 * tienda: en `boutique.globerce.com/admin` se administra `boutique`, aunque la
 * sesión viniera de otra.
 *
 * Guarda los `load`. Las form actions no pasan por aquí: usan `panelContext`.
 */
export async function requireAdmin(event: GuardEvent): Promise<PanelAccess> {
	const { session } = event.locals;

	if (!session) redirect(303, loginUrl(event));

	const account = await currentAccount(event, session);

	const hostSlug = storeSlugFor(event);
	const hostStore = account.stores.find((store) => store.slug === hostSlug);

	if (hostStore && hostStore.id !== session.storeId) {
		const switched = await switchStore(accountContext(event), hostStore.id, session.refreshToken);

		if (switched.ok) {
			writeSession(event.cookies, toAdminSession(switched.data));
			redirect(303, `${event.url.pathname}${event.url.search}`);
		}
	}

	if (!session.storeId) {
		if (account.isPlatformAdmin) redirect(303, '/platform');

		clearSession(event.cookies);
		redirect(303, '/admin/login?error=no-access');
	}

	const store = account.stores.find((candidate) => candidate.id === session.storeId);

	if (!store) {
		clearSession(event.cookies);
		redirect(303, '/admin/login?error=no-access');
	}

	return { account, store };
}

/** Exige una cuenta que administra la plataforma. */
export async function requirePlatformAdmin(event: GuardEvent): Promise<ApiMe> {
	const { session } = event.locals;

	if (!session) redirect(303, loginUrl(event));

	const account = await currentAccount(event, session);

	if (!account.isPlatformAdmin) error(403, 'Esta cuenta no administra la plataforma.');

	return account;
}

/** A dónde va una sesión recién emitida, o por qué no se guardó. */
export type SignInOutcome =
	{ ok: true; destination: 'panel' | 'platform' } | { ok: false; status: 403; error: string };

/**
 * Lo que pasa después de que la API emite una sesión, entre por contraseña o
 * por Google: elige la tienda, guarda la cookie y dice a dónde seguir.
 *
 * - En el host de una tienda se entra a ESA tienda, si la cuenta es parte de
 *   ella, aunque la API haya elegido otra (`hostSlug`).
 * - Sin tienda solo se entra a la consola de la plataforma, si la cuenta la
 *   administra. Si no, la sesión se cierra en la API y no se guarda.
 *
 * No redirige: el login responde con `fail` y el callback de Google con una
 * redirección a otro host, así que cada uno decide cómo contarlo.
 */
export async function completeSignIn(
	cookies: Cookies,
	issued: ApiSession,
	hostSlug: string | null,
	clientIp: string | null
): Promise<SignInOutcome> {
	let session = toAdminSession(issued);

	const hostStore = issued.stores.find((store) => store.slug === hostSlug);

	if (hostStore && hostStore.id !== session.storeId) {
		const switched = await switchStore(
			{ accessToken: session.accessToken, clientIp },
			hostStore.id,
			session.refreshToken
		);

		if (switched.ok) session = toAdminSession(switched.data);
	}

	if (!session.storeId) {
		const account = await me(session.accessToken, clientIp);

		if (account.ok && account.data.isPlatformAdmin) {
			writeSession(cookies, session);
			return { ok: true, destination: 'platform' };
		}

		await logout(session.refreshToken, clientIp);

		return { ok: false, status: 403, error: 'Esta cuenta no tiene acceso al panel.' };
	}

	writeSession(cookies, session);

	return { ok: true, destination: 'panel' };
}
