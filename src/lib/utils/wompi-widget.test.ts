// Tipos
import type { WompiWidget } from '$lib/domain/wompi';

// Librerías
import { afterEach, describe, expect, it, vi } from 'vitest';

// Utilidades
import { isWidget, openWompiWidget, widgetPayment } from '$lib/utils/wompi-widget';

const validWidget = {
	public_key: 'pub_test_llave_publica',
	currency: 'COP',
	amount_in_cents: 4550000,
	reference: 'ord-1',
	integrity_signature: 'firma-de-integridad',
	redirect_url: 'http://localhost:5173/order/1',
	customer_email: null
};

describe('esWidget', () => {
	it('acepta un widget completo, con o sin email', () => {
		expect(isWidget(validWidget)).toBe(true);
		expect(isWidget({ ...validWidget, customer_email: 'clienta@example.com' })).toBe(true);
	});

	it('rechaza lo que no tiene la forma o la moneda', () => {
		expect(isWidget(null)).toBe(false);
		expect(isWidget('widget')).toBe(false);
		expect(isWidget({ ...validWidget, currency: 'USD' })).toBe(false);
		expect(isWidget({ ...validWidget, amount_in_cents: '4550000' })).toBe(false);
	});
});

describe('pagoConWidget', () => {
	it('lee el widget y la URL de respaldo de una action exitosa', () => {
		const payment = widgetPayment({
			type: 'success',
			status: 200,
			data: { widget: validWidget, url: 'https://checkout.wompi.co/p/?x=1' }
		});

		expect(payment?.widget).toEqual(validWidget);
		expect(payment?.url).toBe('https://checkout.wompi.co/p/?x=1');
	});

	it('sin widget, o con uno mal formado, no hay pago con widget', () => {
		expect(
			widgetPayment({ type: 'success', status: 200, data: { url: 'https://x.co' } })
		).toBeNull();
		expect(
			widgetPayment({ type: 'success', status: 200, data: { widget: null, url: 'https://x.co' } })
		).toBeNull();
	});

	it('si la action falla o redirige, no hay pago con widget', () => {
		expect(
			widgetPayment({ type: 'failure', status: 400, data: { error: 'Elige un plan.' } })
		).toBeNull();
		expect(widgetPayment({ type: 'redirect', status: 303, location: '/admin/plan' })).toBeNull();
	});
});

const widget: WompiWidget = {
	public_key: 'pub_test_llave_publica',
	currency: 'COP',
	amount_in_cents: 4550000,
	reference: 'ord-1',
	integrity_signature: 'firma-de-integridad',
	redirect_url: 'http://localhost:5173/order/1',
	customer_email: 'clienta@example.com'
};

type WidgetResult = { transaction?: { id: string; status: string } };

/**
 * Un `WidgetCheckout` falso: anota la configuración y guarda el callback para
 * dispararlo cuando la prueba quiera, como hace Wompi al cerrar el pago.
 */
function fakeWidget() {
	const configs: Record<string, unknown>[] = [];
	let callback: ((outcome: WidgetResult) => void) | null = null;

	class WidgetCheckout {
		constructor(config: Record<string, unknown>) {
			configs.push(config);
		}

		open(cb: (outcome: WidgetResult) => void) {
			callback = cb;
		}
	}

	vi.stubGlobal('window', { WidgetCheckout });

	return {
		configs,
		closeWith(outcome: WidgetResult) {
			callback?.(outcome);
		}
	};
}

describe('openWompiWidget', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('mapea los campos del dominio a la configuración del widget', async () => {
		const fake = fakeWidget();

		await openWompiWidget(widget, () => {});

		expect(fake.configs[0]).toEqual({
			currency: 'COP',
			amountInCents: 4550000,
			reference: 'ord-1',
			publicKey: 'pub_test_llave_publica',
			signature: { integrity: 'firma-de-integridad' },
			redirectUrl: 'http://localhost:5173/order/1',
			customerData: { email: 'clienta@example.com' }
		});
	});

	it('sin email no manda customerData', async () => {
		const fake = fakeWidget();

		await openWompiWidget({ ...widget, customer_email: null }, () => {});

		expect(fake.configs[0]).not.toHaveProperty('customerData');
	});

	it('resuelve al abrir el widget, sin esperar el pago', async () => {
		const fake = fakeWidget();
		const onResult = vi.fn();

		await openWompiWidget(widget, onResult);

		// El widget ya está abierto, pero la clienta todavía no pagó.
		expect(onResult).not.toHaveBeenCalled();

		fake.closeWith({ transaction: { id: 'tx-9', status: 'APPROVED' } });

		expect(onResult).toHaveBeenCalledTimes(1);
	});

	it('pasa la transacción del callback a onResult', async () => {
		const fake = fakeWidget();
		const onResult = vi.fn();

		await openWompiWidget(widget, onResult);
		fake.closeWith({ transaction: { id: 'tx-9', status: 'DECLINED' } });

		expect(onResult).toHaveBeenCalledWith({ id: 'tx-9', status: 'DECLINED' });
	});

	it('pasa null a onResult si el callback no trae transacción', async () => {
		const fake = fakeWidget();
		const onResult = vi.fn();

		await openWompiWidget(widget, onResult);
		fake.closeWith({});

		expect(onResult).toHaveBeenCalledWith(null);
	});
});
