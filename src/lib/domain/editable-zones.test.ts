// Librerías
import { describe, expect, it } from 'vitest';

// Dominio
import { SECCIONES } from '$lib/domain/diseno';
import {
	destinoDeZona,
	EDITABLE_ZONE_NAMES,
	EDITABLE_ZONES,
	isEditableZone,
	urlDeSeccion
} from '$lib/domain/editable-zones';
import { PREVIEW_ZONES } from '$lib/domain/preview';

describe('EDITABLE_ZONES', () => {
	it('toda zona editable apunta a una sección válida', () => {
		for (const zona of EDITABLE_ZONE_NAMES) {
			expect(SECCIONES).toContain(EDITABLE_ZONES[zona].seccion);
		}
	});

	it('toda zona editable existe como zona de la vista previa', () => {
		for (const zona of EDITABLE_ZONE_NAMES) {
			expect(PREVIEW_ZONES).toContain(zona);
		}
	});

	it('cada zona tiene una etiqueta con texto', () => {
		for (const zona of EDITABLE_ZONE_NAMES) {
			expect(EDITABLE_ZONES[zona].etiqueta.length).toBeGreaterThan(0);
		}
	});

	it('los destinos son los que dice el mapa', () => {
		expect(EDITABLE_ZONES['store-header']).toMatchObject({ seccion: 'marca', campo: 'storeName' });
		expect(EDITABLE_ZONES.announcement).toMatchObject({ seccion: 'marca', campo: 'announcement' });
		expect(EDITABLE_ZONES.hero).toMatchObject({ seccion: 'portada' });
		expect(EDITABLE_ZONES.highlights).toMatchObject({ seccion: 'portada' });
	});
});

describe('isEditableZone', () => {
	it('reconoce las zonas editables y rechaza las demás', () => {
		expect(isEditableZone('hero')).toBe(true);
		expect(isEditableZone('categories-menu')).toBe(false);
		expect(isEditableZone(undefined)).toBe(false);
		expect(isEditableZone(7)).toBe(false);
	});
});

describe('mapeo zona → URL de sección', () => {
	it('cada sección tiene su ?seccion=', () => {
		expect(urlDeSeccion('marca')).toBe('?seccion=marca');
		expect(urlDeSeccion('portada')).toBe('?seccion=portada');
	});

	it('una zona lleva a su sección y a su campo', () => {
		expect(destinoDeZona('store-header')).toEqual({ url: '?seccion=marca', campo: 'storeName' });
		expect(destinoDeZona('hero')).toEqual({ url: '?seccion=portada', campo: 'heroCollectionId' });
	});
});
