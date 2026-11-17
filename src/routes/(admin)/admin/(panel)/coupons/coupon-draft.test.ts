// Tipos
import type { PreviewStore } from '$lib/utils/storefront-preview.svelte';

// Librerías
import { describe, expect, it } from 'vitest';

// Estado
import { CouponDraft } from './coupon-draft.svelte';

const store: PreviewStore = {
	settings: {
		template: 'editorial',
		theme: { accent: null, fonts: null, corners: null, hero: null }
	},
	previewUrl: 'https://luna.globerce.co'
};

describe('CouponDraft', () => {
	it('pinta el cupón en el carrito, con lo vacío en cero', () => {
		const coupon = new CouponDraft(() => store);

		coupon.code = 'LUNA10';
		coupon.value = 10;
		coupon.minSubtotal = null;

		expect(coupon.draft.content).toEqual({
			kind: 'coupon',
			code: 'LUNA10',
			type: 'percent',
			value: 10,
			minSubtotal: 0,
			active: true
		});
		expect(coupon.draft.focus).toBe('cart-coupon');
		expect(coupon.src.startsWith('https://luna.globerce.co/preview/cart')).toBe(true);
	});

	it('vuelve a vacío al reiniciar', () => {
		const coupon = new CouponDraft(() => store);

		coupon.code = 'LUNA10';
		coupon.type = 'fixed';
		coupon.reset();

		expect(coupon.code).toBe('');
		expect(coupon.type).toBe('percent');
	});
});
