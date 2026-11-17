import { describe, expect, it } from 'vitest';

import { armarBorrador, focoDe, seccionDe, type BorradorDiseno } from '$lib/domain/diseno';

const borrador: BorradorDiseno = {
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
	foco: 'store-header'
};

describe('seccionDe', () => {
	it('sin `seccion` se ve Estilo', () => {
		expect(seccionDe('')).toBe('estilo');
	});

	it('lee la sección de la URL', () => {
		expect(seccionDe('?seccion=marca')).toBe('marca');
		expect(seccionDe('?seccion=portada')).toBe('portada');
	});

	it('una sección desconocida cae en Estilo', () => {
		expect(seccionDe('?seccion=otra')).toBe('estilo');
	});
});

describe('focoDe', () => {
	it('Marca resalta el encabezado y el anuncio', () => {
		expect(focoDe('marca')).toBe('store-header');
	});

	it('Portada resalta la imagen de arriba', () => {
		expect(focoDe('portada')).toBe('hero');
	});

	it('Estilo no resalta ninguna zona', () => {
		expect(focoDe('estilo')).toBeNull();
	});
});

describe('armarBorrador', () => {
	it('junta la marca y la portada en un solo contenido de portada', () => {
		const draft = armarBorrador(borrador);

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
		const draft = armarBorrador(borrador);

		expect(draft.template).toBe('moda');
		expect(draft.theme).toEqual({ accent: null, fonts: null, corners: null, hero: null });
		expect(draft.focus).toBe('store-header');
	});

	it('una colección destacada va como id; vacío es null', () => {
		const draft = armarBorrador({ ...borrador, heroCollectionId: 'col-1' });

		expect(draft.content?.kind === 'home' && draft.content.heroCollectionId).toBe('col-1');
	});
});
