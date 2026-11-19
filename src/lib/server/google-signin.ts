// Tipos
import type { Cookies, RequestEvent } from '@sveltejs/kit';
import type { ApiFailure } from '$lib/server/api/client';
import type { GoogleSignup, HostRules, OAuthIntent, StartRequest } from '$lib/server/google-oauth';

// Svelte
import { error, redirect } from '@sveltejs/kit';

// App
import { dev } from '$app/environment';

// Servidor
import { acceptInvitationWithGoogle, signInWithGoogle } from '$lib/server/api/auth';
import { completeSignIn } from '$lib/server/auth';
import { clientAddress } from '$lib/server/context';
import { serverEnv } from '$lib/server/env';
import {
	authorizationUrl,
	callbackUrl,
	GOOGLE_SIGNUP_COOKIE,
	GOOGLE_SIGNUP_TTL_SECONDS,
	invitationTokenSchema,
	newOAuthState,
	OAUTH_COOKIE,
	OAUTH_TTL_SECONDS,
	oauthIntentSchema,
	originFor,
	sealGoogleSignup,
	sealOAuthState,
	statesMatch,
	unsealGoogleSignup,
	unsealOAuthState
} from '$lib/server/google-oauth';
import { toAdminSession, writeSession } from '$lib/server/session';

// Dominio
import { GOOGLE_NOTICE_CODES } from '$lib/domain/google-auth';

// Utilidades
import { parsePlatformHosts, storeSlugFromHost } from '$lib/tenant';

/**
 * Las dos rutas de "Entrar con Google" y lo que comparten con `/admin/login` y
 * `/signup`. El formato de las cookies y la validación están en
 * `google-oauth.ts`.
 *
 * Todo pasa en el dominio raíz (`PUBLIC_SITE_URL`): ahí está el único callback
 * registrado en Google y ahí viven las dos cookies del intento. La sesión que
 * sale de aquí sí cruza a los subdominios (`sessionCookieDomain`).
 */

type GoogleEvent = Pick<RequestEvent, 'url' | 'cookies' | 'getClientAddress'>;

/** Lo que acepta `/auth/google`. Un intento que no se reconoce cuenta como entrar. */
const startIntentSchema = oauthIntentSchema.catch('login');

function hostRules(): HostRules {
	const env = serverEnv();

	return {
		siteUrl: env.PUBLIC_SITE_URL,
		rootDomain: env.PUBLIC_STORE_ROOT_DOMAIN,
		platformHosts: parsePlatformHosts(env.PUBLIC_PLATFORM_HOSTS)
	};
}

/** Las dos cookies del intento: solo del host raíz, `httpOnly` y `Lax` (Google vuelve con un GET de nivel superior). */
function cookieOptions(path: string, maxAge?: number) {
	return { path, httpOnly: true, sameSite: 'lax', secure: !dev, maxAge } as const;
}

/**
 * A dónde apunta un botón que arranca el flujo, o null si Google no está configurado.
 *
 * Desde el raíz es una ruta de este sitio. Desde el subdominio de una tienda
 * apunta al raíz y dice de dónde viene (`returnHost`): la cookie del intento y
 * el callback tienen que vivir en el mismo host.
 */
function startHref(url: URL, params: URLSearchParams): string | null {
	const env = serverEnv();

	if (!env.GOOGLE_CLIENT_ID) return null;

	const site = new URL(env.PUBLIC_SITE_URL);

	if (url.host === site.host) return `/auth/google?${params.toString()}`;

	params.set('returnHost', url.host);

	return `${site.origin}/auth/google?${params.toString()}`;
}

export function googleStartHref(
	url: URL,
	intent: Exclude<OAuthIntent, 'invitation'>,
	redirectTo: string | null = null
): string | null {
	const params = new URLSearchParams({ intent });

	if (redirectTo) params.set('redirectTo', redirectTo);

	return startHref(url, params);
}

/**
 * El botón "Aceptar con Google" de una invitación. El token viaja en esta URL
 * (la nuestra) y de ahí a la cookie sellada; nunca en la URL de Google.
 */
export function googleInvitationHref(url: URL, token: string): string | null {
	return startHref(url, new URLSearchParams({ intent: 'invitation', token }));
}

/**
 * Lo que pide `GET /auth/google`. Un intento de invitación sin un enlace válido
 * se rechaza aquí, antes de hablar con Google.
 */
function startRequestFrom(params: URLSearchParams): StartRequest {
	const common = { redirectTo: params.get('redirectTo'), returnHost: params.get('returnHost') };
	const intent = startIntentSchema.parse(params.get('intent'));

	if (intent !== 'invitation') return { ...common, intent };

	const token = invitationTokenSchema.safeParse(params.get('token'));

	if (!token.success) error(400, 'El enlace de la invitación no es válido.');

	return { ...common, intent, invitationToken: token.data };
}

/** `GET /auth/google`: guarda el intento en una cookie sellada y manda a Google. */
export function startGoogleSignIn(event: GoogleEvent): never {
	const env = serverEnv();

	if (!env.GOOGLE_CLIENT_ID) error(404, 'Entrar con Google no está disponible.');

	const site = new URL(env.PUBLIC_SITE_URL);
	const params = event.url.searchParams;

	// Pedido desde otro host: se rebota al raíz recordando de dónde venía. Si
	// la cookie quedara en el subdominio, el callback no la encontraría.
	if (event.url.host !== site.host) {
		const forwarded = new URLSearchParams(params);

		forwarded.set('returnHost', event.url.host);
		redirect(303, `${site.origin}/auth/google?${forwarded.toString()}`);
	}

	const { state, codeChallenge } = newOAuthState(startRequestFrom(params), hostRules());

	event.cookies.set(
		OAUTH_COOKIE,
		sealOAuthState(state, env.SESSION_SECRET),
		cookieOptions('/auth/google', OAUTH_TTL_SECONDS)
	);

	redirect(
		303,
		authorizationUrl({
			clientId: env.GOOGLE_CLIENT_ID,
			redirectUri: callbackUrl(env.PUBLIC_SITE_URL),
			state: state.state,
			codeChallenge
		})
	);
}

/** El código de aviso para la página de origen. El texto vive en `GOOGLE_NOTICES`. */
function noticeFor(apiCode: string): string {
	return apiCode === GOOGLE_NOTICE_CODES.emailUnverified
		? GOOGLE_NOTICE_CODES.emailUnverified
		: GOOGLE_NOTICE_CODES.failed;
}

/** Los códigos de la API que tienen aviso propio al aceptar una invitación. */
const INVITATION_OWN_NOTICES: readonly string[] = [
	GOOGLE_NOTICE_CODES.emailUnverified,
	GOOGLE_NOTICE_CODES.invitationEmailMismatch,
	GOOGLE_NOTICE_CODES.googleAccountLinkedElsewhere
];

/**
 * El aviso de un fallo al aceptar una invitación. Lo de Google y lo propio de la
 * invitación tienen su código; la invitación vencida o ya usada llega como 400 o
 * 404 de la API sin código propio. Lo demás (red, 5xx, Google) es el general.
 */
function invitationNoticeFor(failure: Pick<ApiFailure, 'status' | 'code'>): string {
	const own = INVITATION_OWN_NOTICES.find((code) => code === failure.code);

	if (own) return own;

	const invalid =
		(failure.status === 400 || failure.status === 404) && !failure.code.startsWith('google_');

	return invalid ? GOOGLE_NOTICE_CODES.invitationInvalid : GOOGLE_NOTICE_CODES.failed;
}

/**
 * `GET /auth/google/callback`: confirma que el intento es el nuestro, le pasa
 * el código a la API y sigue según lo que responda.
 *
 * - `session`: misma lógica que el login con contraseña, con la tienda del
 *   host de origen, y de vuelta a ese host.
 * - `invitation`: la API acepta la invitación con esa cuenta de Google; la
 *   sesión se escribe como en la invitación con contraseña y se va a `/admin`.
 * - `signup_required`: el `signupToken` va a otra cookie sellada y la dueña
 *   termina el registro en `/signup?with=google`.
 * - Cancelar en Google, un `state` que no coincide o un fallo de la API: de
 *   vuelta a la página de origen con `?error=…`. Solo viaja un código, nunca
 *   un texto: lo que se pinta lo decide la página. Una invitación vuelve a su
 *   página, con su token, y no al login.
 */
export async function finishGoogleSignIn(event: GoogleEvent): Promise<never> {
	const env = serverEnv();
	const { url, cookies } = event;
	const stored = unsealOAuthState(cookies.get(OAUTH_COOKIE), env.SESSION_SECRET);

	// Un solo uso, salga bien o mal: un `state` no se puede volver a jugar.
	cookies.delete(OAUTH_COOKIE, cookieOptions('/auth/google'));

	const site = new URL(env.PUBLIC_SITE_URL);
	const origin = stored ? originFor(stored.returnHost, env.PUBLIC_SITE_URL) : site.origin;
	const startPage = stored?.intent === 'signup' ? '/signup' : '/admin/login';

	// Con el tipo escrito: así TypeScript sabe que después de `back()` no se sigue.
	const back: (notice: string) => never = (notice) => {
		if (stored?.intent === 'invitation') {
			const query = new URLSearchParams({ token: stored.invitationToken, error: notice });

			redirect(303, `${origin}/admin/invitation?${query.toString()}`);
		}

		const query = new URLSearchParams({ error: notice });

		if (stored && stored.intent === 'login' && stored.redirectTo !== '/admin') {
			query.set('redirectTo', stored.redirectTo);
		}

		redirect(303, `${origin}${startPage}?${query.toString()}`);
	};

	const code = url.searchParams.get('code');

	if (
		!stored ||
		url.searchParams.has('error') ||
		!code ||
		!statesMatch(url.searchParams.get('state'), stored.state)
	) {
		back(GOOGLE_NOTICE_CODES.failed);
	}

	const clientIp = clientAddress(event);
	const redirectUri = callbackUrl(env.PUBLIC_SITE_URL);

	if (stored.intent === 'invitation') {
		const accepted = await acceptInvitationWithGoogle(
			{ token: stored.invitationToken, code, codeVerifier: stored.codeVerifier, redirectUri },
			clientIp
		);

		if (!accepted.ok) back(invitationNoticeFor(accepted));

		// Igual que la invitación con contraseña: la sesión ya está atada a la tienda invitada.
		writeSession(cookies, toAdminSession(accepted.data));
		redirect(303, `${origin}/admin`);
	}

	const result = await signInWithGoogle(
		{ code, codeVerifier: stored.codeVerifier, redirectUri },
		clientIp
	);

	if (!result.ok) back(noticeFor(result.code));

	if (result.data.status === 'signup_required') {
		const signup: GoogleSignup = {
			signupToken: result.data.signupToken,
			email: result.data.email,
			fullName: result.data.fullName,
			expiresAt: Date.now() + GOOGLE_SIGNUP_TTL_SECONDS * 1000
		};

		cookies.set(
			GOOGLE_SIGNUP_COOKIE,
			sealGoogleSignup(signup, env.SESSION_SECRET),
			cookieOptions('/signup', GOOGLE_SIGNUP_TTL_SECONDS)
		);

		// El registro vive en el raíz, venga de donde venga.
		redirect(303, `${site.origin}/signup?with=google`);
	}

	const hostSlug = storeSlugFromHost(
		stored.returnHost,
		env.PUBLIC_STORE_ROOT_DOMAIN,
		env.PUBLIC_STORE_SLUG,
		parsePlatformHosts(env.PUBLIC_PLATFORM_HOSTS)
	);
	const outcome = await completeSignIn(cookies, result.data.session, hostSlug, clientIp);

	if (!outcome.ok) redirect(303, `${origin}/admin/login?error=no-access`);
	if (outcome.destination === 'platform') redirect(303, `${origin}/platform`);

	redirect(303, `${origin}${stored.redirectTo}`);
}

/** Los datos que Google dio para terminar el registro, si el intento sigue vivo. */
export function readGoogleSignup(cookies: Cookies): GoogleSignup | null {
	return unsealGoogleSignup(cookies.get(GOOGLE_SIGNUP_COOKIE), serverEnv().SESSION_SECRET);
}

export function clearGoogleSignup(cookies: Cookies): void {
	cookies.delete(GOOGLE_SIGNUP_COOKIE, cookieOptions('/signup'));
}
