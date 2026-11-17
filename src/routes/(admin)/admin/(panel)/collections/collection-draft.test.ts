// Tipos
import type { PreviewStore } from '$lib/utils/storefront-preview.svelte';

// Librerías
import { describe, expect, it } from 'vitest';

// Estado
import { CollectionDraft } from './collection-draft.svelte';

const store: PreviewStore = {
	settings: {
		template: 'editorial',
		theme: { accent: null, fonts: null, corners: null, hero: null }
	},
	previewUrl: 'https://luna.globerce.co'
};

describe('CollectionDraft', () => {
	it('arma el slug del nombre si no se escribe', () => {
		const collection = new CollectionDraft(() => store);

		collection.name = 'Temporada Clara';

		expect(collection.content().slug).toBe('temporada-clara');

		collection.slug = 'verano';

		expect(collection.content().slug).toBe('verano');
	});

	it('vuelve a vacío al reiniciar', () => {
		const collection = new CollectionDraft(() => store);

		collection.name = 'Verano';
		collection.active = false;
		collection.reset();

		expect(collection.name).toBe('');
		expect(collection.active).toBe(true);
		expect(collection.draft.focus).toBe('collection-header');
	});
});
