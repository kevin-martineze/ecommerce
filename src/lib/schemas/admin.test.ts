// Librerías
import { describe, expect, it } from 'vitest';

// Dominio
import {
	couponSchema,
	priceOverrideSchema,
	productSchema,
	ajustesSchema,
	tiendaSchema,
	shippingZoneSchema
} from '$lib/schemas/admin';

/** Un producto válido, con los campos que cada prueba quiera cambiar. */
function producto(extra: Record<string, unknown> = {}) {
	return { name: 'Blusa', slug: 'blusa', basePrice: '89.900', status: 'active', ...extra };
}

/** Un cupón fijo válido, con los campos que cada prueba quiera cambiar. */
function cupon(extra: Record<string, unknown> = {}) {
	return { code: 'BIENVENIDA10', type: 'fixed', value: '10', minSubtotal: '0', ...extra };
}

describe('precios escritos con puntos', () => {
	it('"89.900" llega como 89900', () => {
		expect(productSchema.safeParse(producto()).data?.basePrice).toBe(89900);
	});

	it('se acepta con signo y espacios', () => {
		expect(productSchema.safeParse(producto({ basePrice: '$ 1.250.000' })).data?.basePrice).toBe(
			1250000
		);
	});

	it('un precio vacío dice que falta, en español', () => {
		const resultado = productSchema.safeParse(producto({ basePrice: '' }));

		expect(resultado.success).toBe(false);
		expect(resultado.error?.issues.at(0)?.message).toBe('Escribe un precio.');
	});

	it.each(['-5', '8.9', '8,5', 'abc'])('«%s» no es un monto y se rechaza', (texto) => {
		const resultado = productSchema.safeParse(producto({ basePrice: texto }));

		expect(resultado.success).toBe(false);
		expect(resultado.error?.issues.at(0)?.message).toBe('Escribe un precio válido.');
	});

	it('el precio tachado se compara como número', () => {
		const mayor = productSchema.safeParse(producto({ compareAtPrice: '120.000' }));

		expect(mayor.data?.compareAtPrice).toBe(120000);

		const menor = productSchema.safeParse(producto({ compareAtPrice: '80.000' }));

		expect(menor.error?.issues.at(0)?.message).toBe(
			'El precio tachado debe ser mayor que el precio actual.'
		);
	});

	it('el precio tachado vacío es ausencia de precio tachado', () => {
		expect(productSchema.safeParse(producto({ compareAtPrice: null })).success).toBe(true);
	});
});

describe('precio propio de una variante', () => {
	it('vacío es el precio del producto', () => {
		expect(priceOverrideSchema.safeParse(null).data).toBeNull();
	});

	it('se lee con puntos', () => {
		expect(priceOverrideSchema.safeParse('89.900').data).toBe(89900);
	});

	it('un texto que no es monto no se guarda', () => {
		expect(priceOverrideSchema.safeParse('abc').success).toBe(false);
	});
});

describe('cupones', () => {
	it('un monto fijo con puntos se lee', () => {
		expect(couponSchema.safeParse(cupon({ value: '89.000' })).data?.value).toBe(89000);
	});

	it('un porcentaje sigue siendo un número simple', () => {
		expect(couponSchema.safeParse(cupon({ type: 'percent', value: '10' })).data?.value).toBe(10);
	});

	it('el valor vacío dice qué falta', () => {
		const resultado = couponSchema.safeParse(cupon({ value: '' }));

		expect(resultado.error?.issues.at(0)?.message).toBe('Escribe el valor del cupón.');
	});

	it('sin mínimo de compra, el mínimo es cero', () => {
		expect(couponSchema.safeParse(cupon({ minSubtotal: undefined })).data?.minSubtotal).toBe(0);
	});

	it('el mínimo de compra con puntos se lee', () => {
		expect(couponSchema.safeParse(cupon({ minSubtotal: '150.000' })).data?.minSubtotal).toBe(
			150000
		);
	});
});

describe('otros montos del panel', () => {
	it('el costo de envío con puntos se lee', () => {
		expect(shippingZoneSchema.safeParse({ name: 'Bogotá', cost: '8.000' }).data?.cost).toBe(8000);
	});

	it('el envío gratis desde se lee con puntos, y vacío es sin envío gratis', () => {
		const ajustes = { whatsappPhone: '573001234567' };

		expect(
			ajustesSchema.safeParse({ ...ajustes, freeShippingThreshold: '250.000' }).data
				?.freeShippingThreshold
		).toBe(250000);
		expect(
			ajustesSchema.safeParse({ ...ajustes, freeShippingThreshold: null }).data
				?.freeShippingThreshold
		).toBeNull();
	});
});

describe('marca de la tienda (Diseño)', () => {
	it('el nombre se pide y se valida en español', () => {
		const resultado = tiendaSchema.safeParse({ storeName: 'A' });

		expect(resultado.error?.issues.at(0)?.message).toBe('Escribe el nombre de la tienda.');
	});

	it('el anuncio vacío es sin anuncio', () => {
		expect(tiendaSchema.safeParse({ storeName: 'Mi tienda' }).data?.announcement).toBe('');
	});

	it('el anuncio pasa de 160 caracteres se rechaza', () => {
		const resultado = tiendaSchema.safeParse({
			storeName: 'Mi tienda',
			announcement: 'x'.repeat(161)
		});

		expect(resultado.error?.issues.at(0)?.message).toBe('Máximo 160 caracteres.');
	});
});
