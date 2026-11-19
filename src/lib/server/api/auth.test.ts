// Tipos
import type { ApiResult } from '$lib/server/api/client';

// Librerías
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Servidor
import { me, setPassword, unlinkGoogle } from '$lib/server/api/auth';
import { apiRequest } from '$lib/server/api/client';

vi.mock('$lib/server/api/client', () => ({ apiRequest: vi.fn() }));

const done: ApiResult<undefined> = { ok: true, data: undefined };

const account = {
	user: { id: 'u1', email: 'ana@tienda.com', fullName: 'Ana' },
	stores: [{ id: 's1', name: 'Casa Oliva', slug: 'casa-oliva', role: 'OWNER' }],
	isPlatformAdmin: false
};

const ctx = { accessToken: 'token-de-acceso', clientIp: '203.0.113.7' };

describe('me: signIn', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(apiRequest).mockResolvedValue(done);
	});

	it('una respuesta sin signIn sigue parseando (la API anterior a la Fase 4)', async () => {
		await me('token', null);

		const [, schema] = vi.mocked(apiRequest).mock.calls[0];
		const parsed = schema.safeParse(account);

		expect(parsed).toMatchObject({ success: true, data: { user: { email: 'ana@tienda.com' } } });
		expect(parsed).not.toHaveProperty('data.signIn');
	});

	it('lee signIn con y sin Google vinculado', async () => {
		await me('token', null);

		const [, schema] = vi.mocked(apiRequest).mock.calls[0];

		const withGoogle = schema.safeParse({
			...account,
			signIn: {
				hasPassword: false,
				google: { email: 'ana@gmail.com', linkedAt: '2026-11-19T12:00:00.000Z' }
			}
		});
		const withoutGoogle = schema.safeParse({
			...account,
			signIn: { hasPassword: true, google: null }
		});

		expect(withGoogle).toMatchObject({
			success: true,
			data: {
				signIn: {
					hasPassword: false,
					google: { email: 'ana@gmail.com', linkedAt: '2026-11-19T12:00:00.000Z' }
				}
			}
		});
		expect(withoutGoogle).toMatchObject({
			success: true,
			data: { signIn: { hasPassword: true, google: null } }
		});
	});

	it('si signIn llega, debe traer hasPassword', async () => {
		await me('token', null);

		const [, schema] = vi.mocked(apiRequest).mock.calls[0];

		expect(schema.safeParse({ ...account, signIn: { google: null } }).success).toBe(false);
	});
});

describe('setPassword', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(apiRequest).mockResolvedValue(done);
	});

	it('manda la contraseña nueva con el refresh token y responde 204 sin cuerpo', async () => {
		await setPassword(ctx, { newPassword: 'una contraseña nueva', refreshToken: 'refresco' });

		const [path, schema, options] = vi.mocked(apiRequest).mock.calls[0];

		expect(path).toBe('/auth/password/set');
		expect(options).toEqual({
			method: 'POST',
			body: { newPassword: 'una contraseña nueva', refreshToken: 'refresco' },
			accessToken: 'token-de-acceso',
			clientIp: '203.0.113.7'
		});
		expect(schema.safeParse(undefined).success).toBe(true);
	});
});

describe('unlinkGoogle', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(apiRequest).mockResolvedValue(done);
	});

	it('desconecta Google con el refresh token y responde 204 sin cuerpo', async () => {
		await unlinkGoogle(ctx, { refreshToken: 'refresco' });

		const [path, schema, options] = vi.mocked(apiRequest).mock.calls[0];

		expect(path).toBe('/auth/identities/google/unlink');
		expect(options).toEqual({
			method: 'POST',
			body: { refreshToken: 'refresco' },
			accessToken: 'token-de-acceso',
			clientIp: '203.0.113.7'
		});
		expect(schema.safeParse(undefined).success).toBe(true);
	});
});
