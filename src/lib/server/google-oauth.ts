// Librerías
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

// Servidor
import { seal, unseal } from '$lib/server/session-crypto';

// Utilidades
import { normalizeHost } from '$lib/tenant';
import { safeRedirectTarget } from '$lib/utils/redirect';

/**
 * Piezas puras del flujo "Entrar con Google" (Authorization Code + PKCE).
 *
 * Este servidor solo arma la URL de Google y recuerda, en una cookie sellada,
 * con qué se pidió el código. El canje y la decisión de la cuenta los hace la
 * API (ver `signInWithGoogle`). Sin `$env` ni cookies de SvelteKit, para
 * probarlas sin levantar nada; las rutas están en `google-signin.ts`.
 */

const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export const OAUTH_COOKIE = 'globerce_oauth';
export const GOOGLE_SIGNUP_COOKIE = 'globerce_google_signup';

/** Lo que tiene la dueña para elegir su cuenta en Google y volver. */
export const OAUTH_TTL_SECONDS = 60 * 10;
/** Lo mismo que dura el `signupToken` en la API. */
export const GOOGLE_SIGNUP_TTL_SECONDS = 60 * 15;

/** El callback es uno solo, en el dominio raíz: Google no acepta comodines. */
export const CALLBACK_PATH = '/auth/google/callback';

export const oauthIntentSchema = z.enum(['login', 'signup', 'invitation']);

export type OAuthIntent = z.infer<typeof oauthIntentSchema>;

const oauthStateSchema = z.object({
	state: z.string().min(32),
	codeVerifier: z.string().min(43).max(128),
	intent: oauthIntentSchema,
	/** Ruta de este sitio a la que se vuelve. Ya pasó por `safeRedirectTarget`. */
	redirectTo: z.string(),
	/** Host desde el que se pidió entrar (el raíz o el subdominio de una tienda). Ya validado. */
	returnHost: z.string(),
	/** Epoch en ms. La cookie vence sola, pero el valor sellado no debe servir después. */
	expiresAt: z.number().int()
});

export type OAuthState = z.infer<typeof oauthStateSchema>;

const googleSignupSchema = z.object({
	signupToken: z.string().min(1),
	email: z.string(),
	fullName: z.string().nullable(),
	expiresAt: z.number().int()
});

export type GoogleSignup = z.infer<typeof googleSignupSchema>;

// Cada cookie se sella con su propio propósito: una no abre como la otra, ni
// como la sesión del panel, aunque compartan `SESSION_SECRET`.
const OAUTH_PURPOSE = 'google-oauth';
const SIGNUP_PURPOSE = 'google-signup';

/** Aleatorio en base64url: 32 bytes dan 43 caracteres, el mínimo que admite PKCE. */
export function randomToken(bytes = 32): string {
	return randomBytes(bytes).toString('base64url');
}

/** `code_challenge` S256 (RFC 7636): SHA-256 del verificador, en base64url sin relleno. */
export function codeChallengeFor(codeVerifier: string): string {
	return createHash('sha256').update(codeVerifier).digest('base64url');
}

export function createPkce(): { codeVerifier: string; codeChallenge: string } {
	const codeVerifier = randomToken();

	return { codeVerifier, codeChallenge: codeChallengeFor(codeVerifier) };
}

/** Compara el `state` sin filtrar por el tiempo cuánto coincide. */
export function statesMatch(received: string | null, expected: string): boolean {
	if (!received) return false;

	const left = Buffer.from(received, 'utf8');
	const right = Buffer.from(expected, 'utf8');

	return left.length === right.length && timingSafeEqual(left, right);
}

/** La URI de callback registrada en Google, siempre en el dominio raíz. */
export function callbackUrl(siteUrl: string): string {
	return `${new URL(siteUrl).origin}${CALLBACK_PATH}`;
}

export interface AuthorizationParams {
	clientId: string;
	redirectUri: string;
	state: string;
	codeChallenge: string;
}

export function authorizationUrl(params: AuthorizationParams): string {
	const query = new URLSearchParams({
		client_id: params.clientId,
		redirect_uri: params.redirectUri,
		response_type: 'code',
		scope: 'openid email profile',
		state: params.state,
		code_challenge: params.codeChallenge,
		code_challenge_method: 'S256',
		// Quien maneja la tienda suele tener el correo personal y el del negocio
		// abiertos a la vez: que elija, en vez de entrar con el que esté activo.
		prompt: 'select_account'
	});

	return `${GOOGLE_AUTHORIZE_URL}?${query.toString()}`;
}

export interface HostRules {
	siteUrl: string;
	/** `PUBLIC_STORE_ROOT_DOMAIN`, con puerto si lo lleva. */
	rootDomain: string | undefined;
	platformHosts: readonly string[];
}

/** Letras, números, puntos y guiones, y un puerto opcional. Nada de `/`, `@` ni espacios. */
const HOST_SHAPE = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/;

/**
 * El host al que se vuelve después de Google, o el del sitio si el pedido no
 * es de confianza.
 *
 * Solo se aceptan hosts nuestros: el del sitio, el dominio raíz de las
 * tiendas, sus subdominios y los de `PUBLIC_PLATFORM_HOSTS`. Sin esto, el
 * callback sería un redirector abierto que además entrega a la dueña con la
 * sesión recién emitida. Un dominio propio de una tienda tampoco vale: la
 * cookie de sesión no llega a él.
 */
export function safeReturnHost(value: string | null, rules: HostRules): string {
	const siteHost = new URL(rules.siteUrl).host;

	if (!value) return siteHost;

	const host = value.trim().toLowerCase();

	if (!HOST_SHAPE.test(host) || host.includes('..')) return siteHost;
	if (host === siteHost) return host;

	const root = rules.rootDomain?.trim().toLowerCase();

	if (root && (host === root || host.endsWith(`.${root}`))) return host;

	if (!host.includes(':') && rules.platformHosts.some((entry) => normalizeHost(entry) === host)) {
		return host;
	}

	return siteHost;
}

/** Origen (`https://boutique.globerce.com`) de un host ya validado, con el protocolo del sitio. */
export function originFor(host: string, siteUrl: string): string {
	return `${new URL(siteUrl).protocol}//${host}`;
}

export interface StartRequest {
	intent: OAuthIntent;
	redirectTo: string | null;
	returnHost: string | null;
}

/** El estado del intento, ya con `redirectTo` y `returnHost` en lo que se puede confiar. */
export function newOAuthState(
	request: StartRequest,
	rules: HostRules,
	now: number = Date.now()
): { state: OAuthState; codeChallenge: string } {
	const { codeVerifier, codeChallenge } = createPkce();

	return {
		codeChallenge,
		state: {
			state: randomToken(),
			codeVerifier,
			intent: request.intent,
			redirectTo: safeRedirectTarget(request.redirectTo),
			returnHost: safeReturnHost(request.returnHost, rules),
			expiresAt: now + OAUTH_TTL_SECONDS * 1000
		}
	};
}

export function sealOAuthState(state: OAuthState, secret: string): string {
	return seal(state, secret, { purpose: OAUTH_PURPOSE });
}

/** El intento guardado, o null si la cookie no es nuestra, fue alterada o ya venció. */
export function unsealOAuthState(
	value: string | undefined,
	secret: string,
	now: number = Date.now()
): OAuthState | null {
	if (!value) return null;

	const state = unseal(value, secret, oauthStateSchema, { purpose: OAUTH_PURPOSE });

	return state && state.expiresAt > now ? state : null;
}

export function sealGoogleSignup(signup: GoogleSignup, secret: string): string {
	return seal(signup, secret, { purpose: SIGNUP_PURPOSE });
}

export function unsealGoogleSignup(
	value: string | undefined,
	secret: string,
	now: number = Date.now()
): GoogleSignup | null {
	if (!value) return null;

	const signup = unseal(value, secret, googleSignupSchema, { purpose: SIGNUP_PURPOSE });

	return signup && signup.expiresAt > now ? signup : null;
}
