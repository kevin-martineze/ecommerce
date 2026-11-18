// Tipos
import type { Section } from '$lib/domain/design';

/**
 * Las zonas de la tienda que se editan desde Diseño. Al hacer clic en una zona
 * de la vista previa, el editor abre la sección y el campo donde se cambia.
 *
 * Solo entran las que de verdad se editan aquí: productos, colecciones del
 * catálogo, carrito, menú y pie no llevan lápiz.
 */
export const EDITABLE_ZONE_NAMES = ['store-header', 'announcement', 'hero', 'highlights'] as const;

export type EditableZoneName = (typeof EDITABLE_ZONE_NAMES)[number];

export interface EditableZone {
	/** La sección de Diseño donde está el campo. */
	section: Section;
	/** El id del control a enfocar dentro de la sección, si hay uno. */
	field?: string;
	/** Lo que el hover de la vista previa dice sobre la zona. */
	tagLabel: string;
}

export const EDITABLE_ZONES: Record<EditableZoneName, EditableZone> = {
	'store-header': { section: 'brand', field: 'storeName', tagLabel: 'Editar marca' },
	announcement: { section: 'brand', field: 'announcement', tagLabel: 'Editar anuncio' },
	hero: { section: 'cover', field: 'heroCollectionId', tagLabel: 'Editar imagen de arriba' },
	highlights: { section: 'cover', field: 'bottom-messages', tagLabel: 'Editar mensajes' }
};

export function isEditableZone(value: unknown): value is EditableZoneName {
	return typeof value === 'string' && (EDITABLE_ZONE_NAMES as readonly string[]).includes(value);
}

/** La URL de una sección de Diseño, relativa a la página del editor. */
export function sectionUrl(section: Section): string {
	return `?section=${section}`;
}

/** A dónde lleva el clic en una zona: la sección y el campo a enfocar. */
export function zoneTarget(zone: EditableZoneName): { url: string; field?: string } {
	const { section, field } = EDITABLE_ZONES[zone];

	return { url: sectionUrl(section), field };
}
