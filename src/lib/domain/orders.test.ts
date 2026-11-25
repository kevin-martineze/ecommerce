// Librerías
import { describe, expect, it } from 'vitest';

// Dominio
import { orderPageMode } from '$lib/domain/orders';

describe('orderPageMode', () => {
	it('un pedido ya pagado siempre se muestra como pagado', () => {
		expect(orderPageMode({ paid: true, canPayOnline: true, via: null })).toBe('paid');
		expect(orderPageMode({ paid: true, canPayOnline: false, via: 'whatsapp' })).toBe('paid');
	});

	it('con cobro en línea y sin WhatsApp elegido, toca pagar', () => {
		expect(orderPageMode({ paid: false, canPayOnline: true, via: null })).toBe('pay');
	});

	it('si la clienta eligió WhatsApp en el carrito, va por WhatsApp aunque haya cobro en línea', () => {
		expect(orderPageMode({ paid: false, canPayOnline: true, via: 'whatsapp' })).toBe('whatsapp');
	});

	it('sin cobro en línea, siempre va por WhatsApp', () => {
		expect(orderPageMode({ paid: false, canPayOnline: false, via: null })).toBe('whatsapp');
	});
});
