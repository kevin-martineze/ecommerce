// Tipos
import type { RequestEvent } from '@sveltejs/kit';

// Librerías
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A dónde se mudó la tienda de un host: solo pregunta en un subdominio de
 * tienda, y arma el mismo camino en el subdominio nuevo.
 */

const publicEnv: Record<string, string> = {
	PUBLIC_SITE_URL: 'https://globerce.store',
	PUBLIC_STORE_ROOT_DOMAIN: 'globerce.store'
};
const privateEnv: Record<string, string> = {
	API_URL: 'https://api.globerce.cloud/v1',
	SESSION_SECRET: 'un-secreto-de-prueba-con-largo-suficiente'
};

vi.mock('$env/dynamic/private', () => ({ env: privateEnv }));
vi.mock('$env/dynamic/public', () => ({ env: publicEnv }));
vi.mock('$lib/server/api/storefront', () => ({ findMovedStore: vi.fn() }));

const { findMovedStore } = await import('$lib/server/api/storefront');
const { resetServerEnv } = await import('$lib/server/env');
const { movedStoreLocation } = await import('$lib/server/moved-store');

type MovedStoreEvent = Pick<RequestEvent, 'getClientAddress' | 'locals' | 'url'>;

function visit(href: string, locals: Partial<App.Locals> = {}): MovedStoreEvent {
	return {
		url: new URL(href),
		locals: { session: null, ...locals },
		getClientAddress: () => '203.0.113.7'
	};
}

const notFound = {
	ok: false as const,
	status: 404,
	code: 'not_found',
	message: 'Esta tienda no existe.',
	details: undefined
};

describe('movedStoreLocation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetServerEnv();
		vi.mocked(findMovedStore).mockResolvedValue({ ok: true, data: { slug: 'marte' } });
	});

	it('lleva el mismo camino al subdominio nuevo', async () => {
		const location = await movedStoreLocation(
			visit('https://perfumeria.globerce.store/admin/login?redirectTo=%2Fadmin')
		);

		expect(findMovedStore).toHaveBeenCalledWith('perfumeria', '203.0.113.7');
		expect(location).toBe('https://marte.globerce.store/admin/login?redirectTo=%2Fadmin');
	});

	it('un subdominio que nunca fue de una tienda no lleva a ninguna parte', async () => {
		vi.mocked(findMovedStore).mockResolvedValue(notFound);

		expect(await movedStoreLocation(visit('https://nadie.globerce.store/robots.txt'))).toBeNull();
	});

	it('no le pregunta a la API en el host de la plataforma ni en un dominio propio', async () => {
		expect(await movedStoreLocation(visit('https://globerce.store/admin/login'))).toBeNull();
		expect(
			await movedStoreLocation(visit('https://perfumesmarte.com/', { storeSlug: 'marte' }))
		).toBeNull();
		expect(findMovedStore).not.toHaveBeenCalled();
	});
});
