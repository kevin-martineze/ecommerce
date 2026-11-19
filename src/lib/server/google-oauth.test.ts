// Tipos
import type { HostRules, OAuthState } from '$lib/server/google-oauth';

// Librerías
import { describe, expect, it } from 'vitest';

// Servidor
import {
	authorizationUrl,
	callbackUrl,
	codeChallengeFor,
	createPkce,
	invitationTokenSchema,
	newOAuthState,
	safeReturnHost,
	sealGoogleSignup,
	sealOAuthState,
	statesMatch,
	unsealGoogleSignup,
	unsealOAuthState
} from '$lib/server/google-oauth';
import { seal, sealSession, unsealSession } from '$lib/server/session-crypto';

const secret = 'un-secreto-de-prueba-con-largo-suficiente';
const now = 1_800_000_000_000;
const TOKEN = '0b8c3d1e-5f6a-4b7c-8d9e-0f1a2b3c4d5e.abcdefghijklmnopqrstuvwx';

const production: HostRules = {
	siteUrl: 'https://globerce.com',
	rootDomain: 'globerce.com',
	platformHosts: ['globerce.store']
};

const development: HostRules = {
	siteUrl: 'http://localhost:5173',
	rootDomain: 'localhost:5173',
	platformHosts: []
};

const state: OAuthState = {
	state: 's'.repeat(43),
	codeVerifier: 'v'.repeat(43),
	intent: 'login',
	redirectTo: '/admin/orders',
	returnHost: 'boutique.globerce.com',
	expiresAt: now + 60_000
};

describe('PKCE', () => {
	// Vector del apéndice B de la RFC 7636.
	it('calcula el code_challenge S256 de la RFC', () => {
		expect(codeChallengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
			'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
		);
	});

	it('el verificador tiene el largo y los caracteres que admite PKCE', () => {
		const { codeVerifier, codeChallenge } = createPkce();

		expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
		expect(codeChallenge).toBe(codeChallengeFor(codeVerifier));
		expect(createPkce().codeVerifier).not.toBe(codeVerifier);
	});
});

describe('authorizationUrl', () => {
	it('pide el código con PKCE S256, los tres scopes y el callback del raíz', () => {
		const url = new URL(
			authorizationUrl({
				clientId: 'cliente.apps.googleusercontent.com',
				redirectUri: callbackUrl('https://globerce.com/'),
				state: 'estado',
				codeChallenge: 'reto'
			})
		);

		expect(url.origin).toBe('https://accounts.google.com');
		expect(Object.fromEntries(url.searchParams)).toMatchObject({
			client_id: 'cliente.apps.googleusercontent.com',
			redirect_uri: 'https://globerce.com/auth/google/callback',
			response_type: 'code',
			scope: 'openid email profile',
			state: 'estado',
			code_challenge: 'reto',
			code_challenge_method: 'S256'
		});
	});
});

describe('safeReturnHost', () => {
	it('acepta el raíz, sus subdominios y los hosts de la plataforma', () => {
		expect(safeReturnHost('globerce.com', production)).toBe('globerce.com');
		expect(safeReturnHost('boutique.globerce.com', production)).toBe('boutique.globerce.com');
		expect(safeReturnHost('Boutique.Globerce.com', production)).toBe('boutique.globerce.com');
		expect(safeReturnHost('globerce.store', production)).toBe('globerce.store');
	});

	it('en desarrollo acepta los subdominios con el puerto del raíz', () => {
		expect(safeReturnHost('boutique.localhost:5173', development)).toBe('boutique.localhost:5173');
		expect(safeReturnHost('localhost:5173', development)).toBe('localhost:5173');
	});

	it('cualquier otro host vuelve al del sitio', () => {
		for (const host of [
			'evil.com',
			'globerce.com.evil.com',
			'evilgloberce.com',
			'evil.com/.globerce.com',
			'evil.com@globerce.com',
			'boutique.globerce.com:8443',
			'boutique..globerce.com',
			'',
			'tienda-propia.co'
		]) {
			expect(safeReturnHost(host, production)).toBe('globerce.com');
		}

		expect(safeReturnHost(null, production)).toBe('globerce.com');
	});
});

describe('newOAuthState', () => {
	it('limpia redirectTo y returnHost antes de guardarlos', () => {
		const { state: built, codeChallenge } = newOAuthState(
			{ intent: 'login', redirectTo: '//evil.com', returnHost: 'evil.com' },
			production,
			now
		);

		expect(built.redirectTo).toBe('/admin');
		expect(built.returnHost).toBe('globerce.com');
		expect(built.expiresAt).toBe(now + 10 * 60 * 1000);
		expect(codeChallenge).toBe(codeChallengeFor(built.codeVerifier));
	});

	it('una invitación guarda su token tal cual', () => {
		const { state: built } = newOAuthState(
			{
				intent: 'invitation',
				invitationToken: TOKEN,
				redirectTo: null,
				returnHost: 'boutique.globerce.com'
			},
			production,
			now
		);

		expect(built).toMatchObject({
			intent: 'invitation',
			invitationToken: TOKEN,
			returnHost: 'boutique.globerce.com'
		});
	});

	it('conserva una ruta nuestra y un subdominio válido', () => {
		const { state: built } = newOAuthState(
			{ intent: 'signup', redirectTo: '/admin/orders?page=2', returnHost: 'boutique.globerce.com' },
			production,
			now
		);

		expect(built.intent).toBe('signup');
		expect(built.redirectTo).toBe('/admin/orders?page=2');
		expect(built.returnHost).toBe('boutique.globerce.com');
	});
});

describe('cookie globerce_oauth', () => {
	it('recupera el mismo intento y no deja leer el verificador', () => {
		const sealed = sealOAuthState(state, secret);

		expect(sealed).not.toContain(state.codeVerifier);
		expect(unsealOAuthState(sealed, secret, now)).toEqual(state);
	});

	it('rechaza una cookie alterada, de otro secreto o vencida', () => {
		const sealed = sealOAuthState(state, secret);
		const replacement = sealed[20] === 'A' ? 'B' : 'A';
		const tampered = `${sealed.slice(0, 20)}${replacement}${sealed.slice(21)}`;

		expect(unsealOAuthState(tampered, secret, now)).toBeNull();
		expect(unsealOAuthState(sealed, 'otro-secreto-igual-de-largo-que-el-real', now)).toBeNull();
		expect(unsealOAuthState(sealed, secret, state.expiresAt)).toBeNull();
		expect(unsealOAuthState(undefined, secret, now)).toBeNull();
	});

	it('recupera una invitación con su token', () => {
		const invitation: OAuthState = {
			state: 'i'.repeat(43),
			codeVerifier: 'v'.repeat(43),
			intent: 'invitation',
			invitationToken: TOKEN,
			redirectTo: '/admin',
			returnHost: 'globerce.com',
			expiresAt: now + 60_000
		};

		expect(unsealOAuthState(sealOAuthState(invitation, secret), secret, now)).toEqual(invitation);
	});

	it('una invitación sellada sin token no se abre', () => {
		const withoutToken = seal({ ...state, intent: 'invitation' }, secret, {
			purpose: 'google-oauth'
		});

		expect(unsealOAuthState(withoutToken, secret, now)).toBeNull();
	});

	it('no abre como sesión ni como registro, ni al revés', () => {
		const signup = sealGoogleSignup(
			{ signupToken: 'token', email: 'a@b.co', fullName: null, expiresAt: now + 60_000 },
			secret
		);
		const session = sealSession(
			{
				accessToken: 'a',
				refreshToken: 'r',
				accessExpiresAt: now,
				userId: 'u',
				email: 'a@b.co',
				storeId: null
			},
			secret
		);
		const oauth = sealOAuthState(state, secret);

		expect(unsealOAuthState(signup, secret, now)).toBeNull();
		expect(unsealOAuthState(session, secret, now)).toBeNull();
		expect(unsealGoogleSignup(oauth, secret, now)).toBeNull();
		expect(unsealSession(oauth, secret)).toBeNull();
	});
});

describe('cookie globerce_google_signup', () => {
	it('recupera los datos de Google hasta que vence', () => {
		const signup = {
			signupToken: 'token-de-registro',
			email: 'maria@gmail.com',
			fullName: 'María Restrepo',
			expiresAt: now + 15 * 60 * 1000
		};
		const sealed = sealGoogleSignup(signup, secret);

		expect(sealed).not.toContain('token-de-registro');
		expect(unsealGoogleSignup(sealed, secret, now)).toEqual(signup);
		expect(unsealGoogleSignup(sealed, secret, signup.expiresAt + 1)).toBeNull();
	});
});

describe('invitationTokenSchema', () => {
	it('acepta el enlace de la API, <storeId>.<secreto>, y nada más', () => {
		expect(invitationTokenSchema.safeParse(TOKEN).success).toBe(true);

		for (const bad of [
			'',
			'sin-punto',
			'no-es-uuid.abcdefghijklmnopqrstuvwx',
			`${TOKEN}/otra-ruta`,
			'0b8c3d1e-5f6a-4b7c-8d9e-0f1a2b3c4d5e.corto'
		]) {
			expect(invitationTokenSchema.safeParse(bad).success).toBe(false);
		}
	});
});

describe('statesMatch', () => {
	it('solo acepta el mismo state', () => {
		expect(statesMatch('abc', 'abc')).toBe(true);
		expect(statesMatch('abd', 'abc')).toBe(false);
		expect(statesMatch('abcd', 'abc')).toBe(false);
		expect(statesMatch(null, 'abc')).toBe(false);
	});
});
