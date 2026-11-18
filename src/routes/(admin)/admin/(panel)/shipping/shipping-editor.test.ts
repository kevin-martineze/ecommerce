// Tipos
import type { ShippingZone } from '$lib/domain/settings';

// Librerías
import { describe, expect, it } from 'vitest';

// Estado
import { ShippingEditor } from './shipping-editor.svelte';

const zone: ShippingZone = {
	id: 'z1',
	name: 'Bogotá',
	cost: 9000,
	eta_days: 2,
	active: true,
	sort_order: 1
};

function editor() {
	return new ShippingEditor(() => ({
		settings: {
			template: 'editorial',
			theme: { accent: null, fonts: null, corners: null, hero: null }
		},
		previewUrl: 'https://luna.globerce.co',
		zones: [zone]
	}));
}

describe('ShippingEditor', () => {
	it('muestra las ediciones encima de lo guardado y las olvida al guardar', () => {
		const shipping = editor();

		shipping.edit('z1', { name: 'Bogotá y Chía' });
		expect(shipping.rows[0].name).toBe('Bogotá y Chía');

		shipping.forget('z1');
		expect(shipping.rows[0].name).toBe('Bogotá');
	});

	it('respeta un costo vaciado y lo pinta en cero', () => {
		const shipping = editor();

		shipping.edit('z1', { cost: null });

		expect(shipping.rows[0].cost).toBeNull();
		expect(shipping.draft.content).toMatchObject({ zones: [{ cost: 0 }] });
	});

	it('agrega la zona nueva solo si tiene nombre', () => {
		const shipping = editor();

		expect(shipping.content().zones).toHaveLength(1);

		shipping.newName = 'Medellín';
		expect(shipping.content().zones).toHaveLength(2);

		shipping.resetNew();
		expect(shipping.content().zones).toHaveLength(1);
		expect(shipping.draft.focus).toBe('shipping-info');
	});
});
