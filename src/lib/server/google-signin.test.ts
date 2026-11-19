// Tipos
import type { Cookies } from '@sveltejs/kit';
import type { ApiSession } from '$lib/server/api/auth';
import type { OAuthState } from '$lib/server/google-oauth';

// Svelte
import { isHttpError, isRedirect } from '@sveltejs/kit';

// Librerías
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Las dos rutas de "Entrar con Google" contra la API simulada: qué cookie
 * dejan, a dónde mandan y a quién le preguntan.
 */

const secret = 'un-secreto-de-prueba-con-largo-suficiente';

const publicEnv: Record<string, string> = {
	PUBLIC_SITE_URL: 'https://globerce.com',
	PUBLIC_STORE_ROOT_DOMAIN: 'globerce.com'
};
const privateEnv: Record<string, string> = {
	API_URL: 'https://api.globerce.cloud/v1',
	SESSION_SECRET: secret,
	GOOGLE_CLIENT_ID: 'cliente.apps.googleusercontent.com'
};

vi.mock('$env/dynamic/private', () => ({ env: privateEnv }));
vi.mock('$env/dynamic/public', () => ({ env: publicEnv }));
vi.mock('$app/environment', () => ({ dev: false }));
vi.mock('$lib/server/api/auth', () => ({
	signInWithGoogle: vi.fn(),
	switchStore: vi.fn(),
	me: vi.fn(),
	logout: vi.fn(),
	refresh: vi.fn()
}));

const { logout, me, signInWithGoogle, switchStore } = await import('$lib/server/api/auth');
const { resetServerEnv } = await import('$lib/server/env');
const { codeChallengeFor, sealOAuthState, unsealGoogleSignup, unsealOAuthState } =
	await import('$lib/server/google-oauth');
const { finishGoogleSignIn, googleStartHref, startGoogleSignIn } =
	await import('$lib/server/google-signin');
const { unsealSession } = await import('$lib/server/session-crypto');

type CookieOptions = Parameters<Cookies['set']>[2];

/** Un tarro de cookies en memoria que recuerda con qué opciones se escribió cada una. */
class FakeCookies implements Cookies {
	jar = new Map<string, string>();
	options = new Map<string, CookieOptions>();
	deleted: string[] = [];

	get(name: string): string | undefined {
		return this.jar.get(name);
	}

	getAll(): Array<{ name: string; value: string }> {
		return [...this.jar].map(([name, value]) => ({ name, value }));
	}

	set(name: string, value: string, options: CookieOptions): void {
		this.jar.set(name, value);
		this.options.set(name, options);
	}

	delete(name: string): void {
		this.jar.delete(name);
		this.deleted.push(name);
	}

	serialize(name: string, value: string): string {
		return `${name}=${value}`;
	}
}

function eventAt(href: string, cookies = new FakeCookies()) {
	return { url: new URL(href), cookies, getClientAddress: () => '203.0.113.7' };
}

/** A dónde redirige lo que corre `run`. Falla si no redirige. */
async function locationOf(run: () => unknown): Promise<string> {
	try {
		await run();
	} catch (thrown) {
		if (isRedirect(thrown)) return thrown.location;
		throw thrown;
	}

	throw new Error('No redirigió.');
}

const issued: ApiSession = {
	accessToken: 'access-token',
	refreshToken: 'refresh-token',
	expiresIn: 900,
	user: { id: 'user-1', email: 'maria@gmail.com', fullName: 'María Restrepo' },
	stores: [
		{ id: 'store-1', name: 'Primera', slug: 'primera', role: 'owner' },
		{ id: 'store-2', name: 'Boutique', slug: 'boutique', role: 'owner' }
	],
	activeStoreId: 'store-1'
};

function pending(overrides: Partial<OAuthState> = {}): OAuthState {
	return {
		state: 'estado-'.padEnd(43, 'x'),
		codeVerifier: 'verificador-'.padEnd(43, 'v'),
		intent: 'login',
		redirectTo: '/admin/orders',
		returnHost: 'globerce.com',
		expiresAt: Date.now() + 60_000,
		...overrides
	};
}

/** El callback como lo deja Google, con la cookie del intento puesta. */
function callback(state: OAuthState, query: string) {
	const cookies = new FakeCookies();

	cookies.set('globerce_oauth', sealOAuthState(state, secret), { path: '/auth/google' });

	return eventAt(`https://globerce.com/auth/google/callback?${query}`, cookies);
}

beforeEach(() => {
	vi.clearAllMocks();
	privateEnv.GOOGLE_CLIENT_ID = 'cliente.apps.googleusercontent.com';
	resetServerEnv();
});

describe('googleStartHref', () => {
	it('sin GOOGLE_CLIENT_ID no hay botón', () => {
		privateEnv.GOOGLE_CLIENT_ID = '';
		resetServerEnv();

		expect(googleStartHref(new URL('https://globerce.com/admin/login'), 'login')).toBeNull();
	});

	it('en el raíz es una ruta relativa', () => {
		expect(
			googleStartHref(new URL('https://globerce.com/admin/login'), 'login', '/admin/orders')
		).toBe('/auth/google?intent=login&redirectTo=%2Fadmin%2Forders');
	});

	it('en una tienda apunta al raíz y dice de dónde viene', () => {
		expect(googleStartHref(new URL('https://boutique.globerce.com/admin/login'), 'login')).toBe(
			'https://globerce.com/auth/google?intent=login&returnHost=boutique.globerce.com'
		);
	});
});

describe('GET /auth/google', () => {
	it('sin GOOGLE_CLIENT_ID responde 404', () => {
		privateEnv.GOOGLE_CLIENT_ID = '';
		resetServerEnv();

		try {
			startGoogleSignIn(eventAt('https://globerce.com/auth/google'));
			expect.unreachable();
		} catch (thrown) {
			expect(isHttpError(thrown) && thrown.status).toBe(404);
		}
	});

	it('desde un subdominio rebota al raíz sin dejar cookie', async () => {
		const event = eventAt('https://boutique.globerce.com/auth/google?intent=login');

		expect(await locationOf(() => startGoogleSignIn(event))).toBe(
			'https://globerce.com/auth/google?intent=login&returnHost=boutique.globerce.com'
		);
		expect(event.cookies.jar.size).toBe(0);
	});

	it('guarda el intento sellado y manda a Google con su state y su reto', async () => {
		const event = eventAt(
			'https://globerce.com/auth/google?intent=login&redirectTo=%2F%2Fevil.com&returnHost=boutique.globerce.com'
		);
		const location = new URL(await locationOf(() => startGoogleSignIn(event)));
		const stored = unsealOAuthState(event.cookies.get('globerce_oauth'), secret);

		expect(stored).not.toBeNull();
		expect(stored?.redirectTo).toBe('/admin');
		expect(stored?.returnHost).toBe('boutique.globerce.com');
		expect(event.cookies.options.get('globerce_oauth')).toMatchObject({
			path: '/auth/google',
			httpOnly: true,
			sameSite: 'lax',
			secure: true,
			maxAge: 600
		});

		expect(location.origin).toBe('https://accounts.google.com');
		expect(location.searchParams.get('state')).toBe(stored?.state);
		expect(location.searchParams.get('code_challenge')).toBe(
			codeChallengeFor(stored?.codeVerifier ?? '')
		);
		expect(location.searchParams.get('redirect_uri')).toBe(
			'https://globerce.com/auth/google/callback'
		);
	});
});

describe('GET /auth/google/callback', () => {
	it('sin la cookie del intento vuelve al login y no llama a la API', async () => {
		const event = eventAt('https://globerce.com/auth/google/callback?code=c&state=s');

		expect(await locationOf(() => finishGoogleSignIn(event))).toBe(
			'https://globerce.com/admin/login?error=google'
		);
		expect(signInWithGoogle).not.toHaveBeenCalled();
	});

	it('un state distinto se rechaza y la cookie se borra', async () => {
		const event = callback(pending(), 'code=c&state=otro-estado');

		expect(await locationOf(() => finishGoogleSignIn(event))).toBe(
			'https://globerce.com/admin/login?error=google&redirectTo=%2Fadmin%2Forders'
		);
		expect(signInWithGoogle).not.toHaveBeenCalled();
		expect(event.cookies.deleted).toContain('globerce_oauth');
	});

	it('cancelar en Google vuelve a la página de origen', async () => {
		const state = pending({ intent: 'signup', redirectTo: '/admin' });
		const event = callback(state, `error=access_denied&state=${state.state}`);

		expect(await locationOf(() => finishGoogleSignIn(event))).toBe(
			'https://globerce.com/signup?error=google'
		);
	});

	it('un correo sin confirmar vuelve con su propio aviso, al host de origen', async () => {
		const state = pending({ returnHost: 'boutique.globerce.com', redirectTo: '/admin' });

		vi.mocked(signInWithGoogle).mockResolvedValue({
			ok: false,
			status: 403,
			code: 'google_email_unverified',
			message: 'Google no confirma el correo.',
			details: undefined
		});

		expect(
			await locationOf(() => finishGoogleSignIn(callback(state, `code=c&state=${state.state}`)))
		).toBe('https://boutique.globerce.com/admin/login?error=google_email_unverified');
	});

	it('cualquier otro fallo de la API vuelve con el aviso general', async () => {
		const state = pending({ redirectTo: '/admin' });

		vi.mocked(signInWithGoogle).mockResolvedValue({
			ok: false,
			status: 400,
			code: 'google_exchange_failed',
			message: 'El código venció.',
			details: undefined
		});

		expect(
			await locationOf(() => finishGoogleSignIn(callback(state, `code=c&state=${state.state}`)))
		).toBe('https://globerce.com/admin/login?error=google');
	});

	it('canjea con el verificador guardado y la URI del raíz', async () => {
		const state = pending();

		vi.mocked(signInWithGoogle).mockResolvedValue({
			ok: true,
			data: { status: 'session', session: issued }
		});

		await locationOf(() =>
			finishGoogleSignIn(callback(state, `code=el-codigo&state=${state.state}`))
		);

		expect(signInWithGoogle).toHaveBeenCalledWith(
			{
				code: 'el-codigo',
				codeVerifier: state.codeVerifier,
				redirectUri: 'https://globerce.com/auth/google/callback'
			},
			'203.0.113.7'
		);
	});

	it('con sesión guarda la cookie y vuelve a redirectTo', async () => {
		const state = pending();
		const event = callback(state, `code=c&state=${state.state}`);

		vi.mocked(signInWithGoogle).mockResolvedValue({
			ok: true,
			data: { status: 'session', session: issued }
		});

		expect(await locationOf(() => finishGoogleSignIn(event))).toBe(
			'https://globerce.com/admin/orders'
		);
		expect(unsealSession(event.cookies.get('globerce_session') ?? '', secret)?.storeId).toBe(
			'store-1'
		);
		// La sesión cruza a los subdominios de las tiendas.
		expect(event.cookies.options.get('globerce_session')?.domain).toBe('.globerce.com');
		expect(switchStore).not.toHaveBeenCalled();
	});

	it('desde el subdominio de otra tienda de la cuenta entra a esa tienda', async () => {
		const state = pending({ returnHost: 'boutique.globerce.com', redirectTo: '/admin' });
		const event = callback(state, `code=c&state=${state.state}`);

		vi.mocked(signInWithGoogle).mockResolvedValue({
			ok: true,
			data: { status: 'session', session: issued }
		});
		vi.mocked(switchStore).mockResolvedValue({
			ok: true,
			data: { ...issued, accessToken: 'access-boutique', activeStoreId: 'store-2' }
		});

		expect(await locationOf(() => finishGoogleSignIn(event))).toBe(
			'https://boutique.globerce.com/admin'
		);
		expect(vi.mocked(switchStore).mock.calls[0]?.[1]).toBe('store-2');
		expect(unsealSession(event.cookies.get('globerce_session') ?? '', secret)?.storeId).toBe(
			'store-2'
		);
	});

	it('sin tienda y sin consola cierra la sesión en la API y no guarda nada', async () => {
		const state = pending();
		const event = callback(state, `code=c&state=${state.state}`);

		vi.mocked(signInWithGoogle).mockResolvedValue({
			ok: true,
			data: { status: 'session', session: { ...issued, stores: [], activeStoreId: null } }
		});
		vi.mocked(me).mockResolvedValue({
			ok: true,
			data: { user: issued.user, stores: [], isPlatformAdmin: false }
		});
		vi.mocked(logout).mockResolvedValue({ ok: true, data: undefined });

		expect(await locationOf(() => finishGoogleSignIn(event))).toBe(
			'https://globerce.com/admin/login?error=no-access'
		);
		expect(logout).toHaveBeenCalledWith('refresh-token', '203.0.113.7');
		expect(event.cookies.get('globerce_session')).toBeUndefined();
	});

	it('quien administra la plataforma va a /platform', async () => {
		const state = pending();
		const event = callback(state, `code=c&state=${state.state}`);

		vi.mocked(signInWithGoogle).mockResolvedValue({
			ok: true,
			data: { status: 'session', session: { ...issued, stores: [], activeStoreId: null } }
		});
		vi.mocked(me).mockResolvedValue({
			ok: true,
			data: { user: issued.user, stores: [], isPlatformAdmin: true }
		});

		expect(await locationOf(() => finishGoogleSignIn(event))).toBe('https://globerce.com/platform');
		expect(event.cookies.get('globerce_session')).toBeDefined();
	});

	it('sin cuenta guarda el signupToken sellado y manda a terminar el registro', async () => {
		const state = pending({ returnHost: 'boutique.globerce.com' });
		const event = callback(state, `code=c&state=${state.state}`);

		vi.mocked(signInWithGoogle).mockResolvedValue({
			ok: true,
			data: {
				status: 'signup_required',
				signupToken: 'token-de-registro',
				email: 'maria@gmail.com',
				fullName: 'María Restrepo'
			}
		});

		expect(await locationOf(() => finishGoogleSignIn(event))).toBe(
			'https://globerce.com/signup?with=google'
		);

		const sealed = event.cookies.get('globerce_google_signup');

		expect(sealed).not.toContain('token-de-registro');
		expect(unsealGoogleSignup(sealed, secret)).toMatchObject({
			signupToken: 'token-de-registro',
			email: 'maria@gmail.com',
			fullName: 'María Restrepo'
		});
		expect(event.cookies.options.get('globerce_google_signup')).toMatchObject({
			path: '/signup',
			httpOnly: true,
			maxAge: 900
		});
		expect(event.cookies.get('globerce_session')).toBeUndefined();
	});
});
