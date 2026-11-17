// Librerías
import { describe, expect, it } from 'vitest';

// Dominio
import { SECTIONS } from '$lib/domain/design';
import {
	zoneTarget,
	EDITABLE_ZONE_NAMES,
	EDITABLE_ZONES,
	isEditableZone,
	sectionUrl
} from '$lib/domain/editable-zones';
import { PREVIEW_ZONES } from '$lib/domain/preview';

describe('EDITABLE_ZONES', () => {
	it('toda zona editable apunta a una sección válida', () => {
		for (const zone of EDITABLE_ZONE_NAMES) {
			expect(SECTIONS).toContain(EDITABLE_ZONES[zone].section);
		}
	});

	it('toda zona editable existe como zona de la vista previa', () => {
		for (const zone of EDITABLE_ZONE_NAMES) {
			expect(PREVIEW_ZONES).toContain(zone);
		}
	});

	it('cada zona tiene una etiqueta con texto', () => {
		for (const zone of EDITABLE_ZONE_NAMES) {
			expect(EDITABLE_ZONES[zone].tagLabel.length).toBeGreaterThan(0);
		}
	});

	it('los destinos son los que dice el mapa', () => {
		expect(EDITABLE_ZONES['store-header']).toMatchObject({ section: 'marca', field: 'storeName' });
		expect(EDITABLE_ZONES.announcement).toMatchObject({ section: 'marca', field: 'announcement' });
		expect(EDITABLE_ZONES.hero).toMatchObject({ section: 'portada' });
		expect(EDITABLE_ZONES.highlights).toMatchObject({ section: 'portada' });
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
	it('cada sección tiene su ?section=', () => {
		expect(sectionUrl('marca')).toBe('?section=marca');
		expect(sectionUrl('portada')).toBe('?section=portada');
	});

	it('una zona lleva a su sección y a su campo', () => {
		expect(zoneTarget('store-header')).toEqual({ url: '?section=marca', field: 'storeName' });
		expect(zoneTarget('hero')).toEqual({ url: '?section=portada', field: 'heroCollectionId' });
	});
});
