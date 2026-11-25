// Librerías
import { describe, expect, it } from 'vitest';

// Dominio
import { checkoutSchema } from '$lib/schemas/checkout';

const valid = {
	name: 'María Oliva',
	phone: '3001234567',
	shippingZoneId: '0b9f1c52-6f1e-4d3a-8b7e-2c9d4a1f5e60'
};

describe('checkoutSchema · paymentMethod', () => {
	it('acepta pagar en línea o acordar por WhatsApp', () => {
		expect(checkoutSchema.parse({ ...valid, paymentMethod: 'online' }).paymentMethod).toBe(
			'online'
		);
		expect(checkoutSchema.parse({ ...valid, paymentMethod: 'whatsapp' }).paymentMethod).toBe(
			'whatsapp'
		);
	});

	it('si no llega, el pedido queda para acordar por WhatsApp', () => {
		expect(checkoutSchema.parse(valid).paymentMethod).toBe('whatsapp');
	});

	it('rechaza un método que la tienda no ofrece', () => {
		expect(checkoutSchema.safeParse({ ...valid, paymentMethod: 'efectivo' }).success).toBe(false);
		expect(checkoutSchema.safeParse({ ...valid, paymentMethod: null }).success).toBe(false);
	});
});
