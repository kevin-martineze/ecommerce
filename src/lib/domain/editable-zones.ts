// Tipos
import type { Seccion } from '$lib/domain/diseno';

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
	seccion: Seccion;
	/** El id del control a enfocar dentro de la sección, si hay uno. */
	campo?: string;
	/** Lo que el hover de la vista previa dice sobre la zona. */
	etiqueta: string;
}

export const EDITABLE_ZONES: Record<EditableZoneName, EditableZone> = {
	'store-header': { seccion: 'marca', campo: 'storeName', etiqueta: 'Editar marca' },
	announcement: { seccion: 'marca', campo: 'announcement', etiqueta: 'Editar anuncio' },
	hero: { seccion: 'portada', campo: 'heroCollectionId', etiqueta: 'Editar imagen de arriba' },
	highlights: { seccion: 'portada', campo: 'mensajes-de-abajo', etiqueta: 'Editar mensajes' }
};

export function isEditableZone(valor: unknown): valor is EditableZoneName {
	return typeof valor === 'string' && (EDITABLE_ZONE_NAMES as readonly string[]).includes(valor);
}

/** La URL de una sección de Diseño, relativa a la página del editor. */
export function urlDeSeccion(seccion: Seccion): string {
	return `?seccion=${seccion}`;
}

/** A dónde lleva el clic en una zona: la sección y el campo a enfocar. */
export function destinoDeZona(zona: EditableZoneName): { url: string; campo?: string } {
	const { seccion, campo } = EDITABLE_ZONES[zona];

	return { url: urlDeSeccion(seccion), campo };
}
