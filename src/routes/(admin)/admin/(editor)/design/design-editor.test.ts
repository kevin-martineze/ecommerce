// Tipos
import type { Section } from '$lib/domain/design';
import type { Collection, HomeHighlight, StoreSettings } from '$lib/domain/settings';

// Librerías
import { describe, expect, it } from 'vitest';

// Estado
import { countChanges, type DesignData, DesignEditor, snapshotOf } from './design-editor.svelte';

const settings: StoreSettings = {
	store_name: 'Tienda Luna',
	whatsapp_phone: '573001112233',
	instagram_url: null,
	announcement: null,
	free_shipping_threshold: null,
	hero_collection_id: null,
	hero_title: 'Ropa para el día',
	hero_subtitle: null,
	logo_url: null,
	icon_url: null,
	template: 'editorial',
	theme: { accent: null, fonts: null, corners: null, hero: null },
	assistant: false,
	online_payments: false,
	public_url: 'https://luna.globerce.co'
};

const collection: Collection = {
	id: 'c1',
	slug: 'verano',
	name: 'Verano',
	description: null,
	hero_image_url: null,
	hero_storage_path: null,
	active: true,
	sort_order: 1
};

const highlight: HomeHighlight = {
	id: 'h1',
	eyebrow: 'Envíos',
	title: 'A todo el país',
	body: 'Llega en 3 días.',
	sort_order: 4,
	active: true
};

function editorFor(section: Section = 'style', data: Partial<DesignData> = {}) {
	return new DesignEditor(
		() => ({
			settings,
			collections: [collection],
			highlights: [highlight],
			previewUrl: 'https://luna.globerce.co',
			...data
		}),
		() => section
	);
}

describe('DesignEditor', () => {
	it('arranca con lo guardado y sin cambios', () => {
		const editor = editorFor();

		expect(editor.values).toEqual(snapshotOf(settings));
		expect(editor.changed).toBe(false);
	});

	it('cuenta los cambios y los descarta', () => {
		const editor = editorFor();

		editor.values.storeName = 'Luna';
		editor.values.announcement = 'Envío gratis';

		expect(editor.changes).toHaveLength(2);
		expect(editor.leaveWarning()).toBe('Tienes 2 cambios sin guardar. ¿Salir sin guardarlos?');

		editor.discardDialogOpen = true;
		editor.discard();

		expect(editor.changed).toBe(false);
		expect(editor.discardDialogOpen).toBe(false);
		expect(editor.leaveWarning()).toBeNull();
	});

	it('marca inválido un color que no es hex', () => {
		const editor = editorFor();

		editor.values.accent = 'rojo';

		expect(editor.invalid).toBe(true);
	});

	it('limpia los ajustes de la plantilla sin tocar la marca', () => {
		const editor = editorFor();

		editor.values.accent = '#111111';
		editor.values.fonts = 'serif';
		editor.values.storeName = 'Luna';
		editor.clearAdjustments();

		expect(editor.values.accent).toBe('');
		expect(editor.values.fonts).toBe('');
		expect(editor.values.storeName).toBe('Luna');
	});

	it('llena el FormData con todo el borrador', () => {
		const editor = editorFor();
		const formData = new FormData();

		editor.values.heroCollectionId = 'c1';
		editor.fill(formData);

		expect(formData.get('heroCollectionId')).toBe('c1');
		expect(formData.get('storeName')).toBe('Tienda Luna');
		expect(formData.get('template')).toBe('editorial');
	});

	it('encuentra la colección elegida', () => {
		const editor = editorFor();

		expect(editor.chosenCollection).toBeNull();

		editor.values.heroCollectionId = 'c1';

		expect(editor.chosenCollection?.name).toBe('Verano');
		expect(editor.collectionOptions.map((option) => option.value)).toEqual(['', 'c1']);
	});

	it('resalta los mensajes solo en la portada', () => {
		const cover = editorFor('cover');
		const style = editorFor('style');

		cover.inMessages = true;
		style.inMessages = true;

		expect(cover.draft.focus).toBe('highlights');
		expect(style.draft.focus).toBeNull();
	});

	it('arma la vista previa en la página elegida', () => {
		const editor = editorFor();

		editor.path = '/shop';

		expect(editor.previewSrc.startsWith('https://luna.globerce.co/shop')).toBe(true);
	});
});

describe('HighlightsEditor', () => {
	it('muestra las ediciones encima de lo guardado', () => {
		const { highlights } = editorFor('cover');

		highlights.edit('h1', { title: 'A toda Colombia' });

		expect(highlights.rows[0].title).toBe('A toda Colombia');
		expect(highlights.rows[0].body).toBe('Llega en 3 días.');
	});

	it('agrega el bloque nuevo a la vista previa solo si tiene texto', () => {
		const { highlights } = editorFor('cover');

		expect(highlights.draft).toHaveLength(1);
		expect(highlights.newOrder).toBe(5);

		highlights.newTitle = 'Cambios fáciles';

		expect(highlights.draft).toHaveLength(2);
		expect(highlights.draft[1].sortOrder).toBe(5);

		highlights.resetNew();

		expect(highlights.newTitle).toBe('');
		expect(highlights.draft).toHaveLength(1);
	});
});

describe('countChanges', () => {
	it('dice cambio o cambios', () => {
		expect(countChanges(1)).toBe('1 cambio');
		expect(countChanges(3)).toBe('3 cambios');
	});
});
