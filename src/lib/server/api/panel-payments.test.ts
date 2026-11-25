// Librerías
import { describe, expect, it } from 'vitest';

// Servidor
import { accountSchema } from '$lib/server/api/panel-payments';

const base = {
	connected: true,
	provider: 'wompi',
	publicKey: 'pub_test_llave_publica',
	eventsUrl: 'https://api.globerce.co/payments/events/abc',
	updatedAt: '2026-11-03T15:00:00.000Z'
};

describe('accountSchema', () => {
	it('lee los campos nuevos de la verificación y del aviso', () => {
		const parsed = accountSchema.parse({
			...base,
			merchantName: 'Tienda Mariposa',
			mode: 'test',
			lastEventAt: '2026-11-03T16:00:00.000Z'
		});

		expect(parsed).toEqual({
			connected: true,
			provider: 'wompi',
			public_key: 'pub_test_llave_publica',
			events_url: 'https://api.globerce.co/payments/events/abc',
			updated_at: '2026-11-03T15:00:00.000Z',
			merchant_name: 'Tienda Mariposa',
			mode: 'test',
			last_event_at: '2026-11-03T16:00:00.000Z',
			shares_platform_account: false
		});
	});

	it('una API anterior, sin los campos nuevos, sigue sirviendo con null', () => {
		const parsed = accountSchema.parse(base);

		expect(parsed.merchant_name).toBeNull();
		expect(parsed.mode).toBeNull();
		expect(parsed.last_event_at).toBeNull();
	});

	it('con sharesPlatformAccount en true, la tienda comparte la cuenta de Globerce', () => {
		const parsed = accountSchema.parse({ ...base, sharesPlatformAccount: true });

		expect(parsed.shares_platform_account).toBe(true);
	});

	it('sin sharesPlatformAccount, asume que la tienda tiene cuenta propia', () => {
		const parsed = accountSchema.parse(base);

		expect(parsed.shares_platform_account).toBe(false);
	});

	it('un modo que no es pruebas ni producción no pasa', () => {
		expect(accountSchema.safeParse({ ...base, mode: 'staging' }).success).toBe(false);
	});
});
