// Tipos
import type { ApiResult } from '$lib/server/api/client';
import type { AdminSession } from '$lib/server/session-crypto';

// Librerías
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Servidor
import { setPassword, unlinkGoogle } from '$lib/server/api/auth';

// Utilidades
import { actions } from './+page.server';

vi.mock('$lib/server/api/auth', () => ({
	changePassword: vi.fn(),
	me: vi.fn(),
	setPassword: vi.fn(),
	switchStore: vi.fn(),
	unlinkGoogle: vi.fn()
}));

vi.mock('$lib/server/session', () => ({ toAdminSession: vi.fn(), writeSession: vi.fn() }));

const session: AdminSession = {
	accessToken: 'token-de-acceso',
	refreshToken: 'token-de-refresco',
	accessExpiresAt: Date.now() + 600_000,
	userId: 'u1',
	email: 'ana@tienda.com',
	storeId: 's1'
};

const done: ApiResult<undefined> = { ok: true, data: undefined };

function failure(status: number, code: string, message: string): ApiResult<undefined> {
	return { ok: false, status, code, message, details: undefined };
}

/** Un evento de action con el formulario dado. La cuenta de la sesión por defecto. */
function accountEvent(
	fields: Record<string, string>,
	current: AdminSession | null = session
): Parameters<typeof actions.setPassword>[0] {
	const body = new FormData();

	for (const [name, value] of Object.entries(fields)) body.set(name, value);

	return {
		request: new Request('http://localhost/admin/account?/setPassword', { method: 'POST', body }),
		locals: { session: current },
		url: new URL('http://localhost/admin/account'),
		getClientAddress: () => '203.0.113.7'
	};
}

const validPassword = { password: 'doce caracteres', confirm: 'doce caracteres' };

describe('action setPassword', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('crea la contraseña con el refresh token de la sesión y responde con el aviso', async () => {
		vi.mocked(setPassword).mockResolvedValue(done);

		const result = await actions.setPassword(accountEvent(validPassword));

		expect(result).toEqual({
			message: 'Listo, ya puedes entrar también con tu correo y contraseña.'
		});
		expect(setPassword).toHaveBeenCalledWith(
			{ accessToken: 'token-de-acceso', clientIp: '203.0.113.7' },
			{ newPassword: 'doce caracteres', refreshToken: 'token-de-refresco' }
		);
	});

	it('valida en el servidor: si no coinciden, ni llega a la API', async () => {
		const result = await actions.setPassword(
			accountEvent({ password: 'doce caracteres', confirm: 'doce caracteres distintos' })
		);

		expect(result).toMatchObject({
			status: 400,
			data: { error: 'Las contraseñas no coinciden.' }
		});
		expect(setPassword).not.toHaveBeenCalled();
	});

	it('si la cuenta ya tiene contraseña, muestra el mensaje de la API con su status', async () => {
		vi.mocked(setPassword).mockResolvedValue(
			failure(409, 'password_already_set', 'Esta cuenta ya tiene contraseña.')
		);

		const result = await actions.setPassword(accountEvent(validPassword));

		expect(result).toMatchObject({
			status: 409,
			data: { error: 'Esta cuenta ya tiene contraseña.' }
		});
	});

	it('si la API falla de su lado, responde 503 y no cierra la sesión', async () => {
		vi.mocked(setPassword).mockResolvedValue(
			failure(500, 'http_error', 'Algo falló de nuestro lado.')
		);

		const result = await actions.setPassword(accountEvent(validPassword));

		expect(result).toMatchObject({ status: 503, data: { error: 'Algo falló de nuestro lado.' } });
	});

	it('sin sesión manda al login y no llama a la API', async () => {
		await expect(actions.setPassword(accountEvent(validPassword, null))).rejects.toMatchObject({
			status: 303
		});
		expect(setPassword).not.toHaveBeenCalled();
	});
});

describe('action unlinkGoogle', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('desconecta Google con el refresh token de la sesión y responde con el aviso', async () => {
		vi.mocked(unlinkGoogle).mockResolvedValue(done);

		const result = await actions.unlinkGoogle(accountEvent({}));

		expect(result).toEqual({ message: 'Google desconectado.' });
		expect(unlinkGoogle).toHaveBeenCalledWith(
			{ accessToken: 'token-de-acceso', clientIp: '203.0.113.7' },
			{ refreshToken: 'token-de-refresco' }
		);
	});

	it('si la cuenta no tiene contraseña, la API lo rechaza y la action lo muestra', async () => {
		vi.mocked(unlinkGoogle).mockResolvedValue(
			failure(
				409,
				'password_required',
				'Primero crea una contraseña. Sin ella no podrías volver a entrar.'
			)
		);

		const result = await actions.unlinkGoogle(accountEvent({}));

		expect(result).toMatchObject({
			status: 409,
			data: { error: 'Primero crea una contraseña. Sin ella no podrías volver a entrar.' }
		});
	});

	it('si no hay Google vinculado, lo dice la API con 404', async () => {
		vi.mocked(unlinkGoogle).mockResolvedValue(
			failure(404, 'google_not_linked', 'Esta cuenta no tiene Google conectado.')
		);

		const result = await actions.unlinkGoogle(accountEvent({}));

		expect(result).toMatchObject({
			status: 404,
			data: { error: 'Esta cuenta no tiene Google conectado.' }
		});
	});

	it('sin sesión manda al login y no llama a la API', async () => {
		await expect(actions.unlinkGoogle(accountEvent({}, null))).rejects.toMatchObject({
			status: 303
		});
		expect(unlinkGoogle).not.toHaveBeenCalled();
	});
});
