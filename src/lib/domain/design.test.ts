// Librerías
import { describe, expect, it } from 'vitest';

// Dominio
import { buildDraft, focusFor, sectionFrom, type DesignDraft } from '$lib/domain/design';

const draftInput: DesignDraft = {
	template: 'moda',
	accent: '',
	fonts: '',
	corners: '',
	hero: '',
	storeName: 'Mi tienda',
	announcement: 'Envío gratis hoy',
	heroCollectionId: '',
	heroTitle: 'Productos que duran',
	heroSubtitle: 'Selección corta.',
	highlights: [],
	focusZone: 'store-header'
};

describe('seccionDe', () => {
	it('sin `seccion` se ve Estilo', () => {
		expect(sectionFrom('')).toBe('estilo');
	});

	it('lee la sección de la URL', () => {
		expect(sectionFrom('?section=marca')).toBe('marca');
		expect(sectionFrom('?section=portada')).toBe('portada');
	});

	it('una sección desconocida cae en Estilo', () => {
		expect(sectionFrom('?section=otra')).toBe('estilo');
	});
});

describe('focoDe', () => {
	it('Marca resalta el encabezado y el anuncio', () => {
		expect(focusFor('marca')).toBe('store-header');
	});

	it('Portada resalta la imagen de arriba', () => {
		expect(focusFor('portada')).toBe('hero');
	});

	it('Estilo no resalta ninguna zona', () => {
		expect(focusFor('estilo')).toBeNull();
	});
});

describe('armarBorrador', () => {
	it('junta la marca y la portada en un solo contenido de portada', () => {
		const draft = buildDraft(draftInput);

		expect(draft.content).toEqual({
			kind: 'home',
			heroCollectionId: null,
			heroTitle: 'Productos que duran',
			heroSubtitle: 'Selección corta.',
			highlights: [],
			storeName: 'Mi tienda',
			announcement: 'Envío gratis hoy'
		});
	});

	it('lleva la plantilla, el tema vacío y la zona que se resalta', () => {
		const draft = buildDraft(draftInput);

		expect(draft.template).toBe('moda');
		expect(draft.theme).toEqual({ accent: null, fonts: null, corners: null, hero: null });
		expect(draft.focus).toBe('store-header');
	});

	it('una colección destacada va como id; vacío es null', () => {
		const draft = buildDraft({ ...draftInput, heroCollectionId: 'col-1' });

		expect(draft.content?.kind === 'home' && draft.content.heroCollectionId).toBe('col-1');
	});
});
