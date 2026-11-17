// Tipos
import type { Section } from '$lib/domain/design';
import type { StorefrontTemplate } from '$lib/domain/templates';

// Dominio
import { templateOf } from '$lib/domain/templates';
import { CORNER_OPTIONS, FONT_OPTIONS, HERO_OPTIONS } from '$lib/domain/theme';

/** Lo que el editor de Diseño guarda para una tienda: el estado escalar completo. */
export interface DesignSnapshot {
	template: StorefrontTemplate;
	accent: string;
	fonts: string;
	corners: string;
	hero: string;
	storeName: string;
	announcement: string;
	heroCollectionId: string;
	heroTitle: string;
	heroSubtitle: string;
}

export interface DesignCollection {
	id: string;
	name: string;
}

/** Un cambio entre lo guardado y el borrador, en palabras de la dueña. */
export interface DesignChange {
	section: Section;
	field: string;
	kind: 'cambia' | 'agrega' | 'quita';
	antes: string;
	after: string;
	/** Frase extra, por ejemplo «Vuelve a lo que trae la plantilla». */
	note?: string;
	/** Hex a mostrar como muestra de color. */
	swatch?: string;
	/** Cambios que se notan mucho en la tienda: la plantilla y la colección destacada. */
	featured: boolean;
}

/** Lo que se muestra de un texto largo: 60 caracteres y «…» si se corta. */
const LARGO = 60;

export function truncate(text: string): string {
	if (text.length <= LARGO) return text;

	return `${text.slice(0, LARGO - 1).trimEnd()}…`;
}

const RETURN_TO = 'Vuelve a lo que trae la plantilla';

function nameOf(options: { code: string; name: string }[], code: string): string {
	return options.find((option) => option.code === code)?.name ?? code;
}

/**
 * Compara lo guardado con el borrador y devuelve los cambios, en el orden de
 * las secciones: Estilo, Marca y Portada.
 *
 * Un campo que pasa de vacío a valor se «agrega»; uno que vuelve a vacío (o a lo
 * que trae la plantilla) se «quita»; el resto «cambia». Los campos de estilo que
 * vuelven a «De la plantilla» llevan la nota de «Quitar mis ajustes».
 */
export function describeDesignChanges(
	saved: DesignSnapshot,
	draft: DesignSnapshot,
	collections: DesignCollection[]
): DesignChange[] {
	const changes: DesignChange[] = [];

	const collectionName = (id: string) =>
		id === '' ? 'Ninguna' : (collections.find((collection) => collection.id === id)?.name ?? id);

	/** Un campo de texto libre (nombre, anuncio, título, texto). */
	function text(section: Section, field: string, antes: string, after: string): void {
		if (antes === after) return;

		const kind = antes === '' ? 'agrega' : after === '' ? 'quita' : 'cambia';

		changes.push({
			section,
			field,
			kind,
			antes: truncate(antes),
			after: truncate(after),
			featured: false
		});
	}

	/** Un ajuste de estilo con opciones: '' es «De la plantilla». */
	function style(
		field: string,
		antes: string,
		after: string,
		tagLabel: (code: string) => string
	): void {
		if (antes === after) return;

		if (after === '') {
			changes.push({
				section: 'estilo',
				field,
				kind: 'quita',
				antes: tagLabel(antes),
				after: '',
				note: RETURN_TO,
				featured: false
			});
			return;
		}

		changes.push({
			section: 'estilo',
			field,
			kind: antes === '' ? 'agrega' : 'cambia',
			antes: antes === '' ? '' : tagLabel(antes),
			after: tagLabel(after),
			featured: false
		});
	}

	// 1. Estilo: plantilla, color, letras, esquinas y el estilo de la imagen de arriba.
	if (saved.template !== draft.template) {
		changes.push({
			section: 'estilo',
			field: 'Plantilla',
			kind: 'cambia',
			antes: templateOf(saved.template).name,
			after: templateOf(draft.template).name,
			featured: true
		});
	}

	if (saved.accent !== draft.accent) {
		const kind = saved.accent === '' ? 'agrega' : draft.accent === '' ? 'quita' : 'cambia';

		changes.push({
			section: 'estilo',
			field: 'Color',
			kind,
			antes: saved.accent,
			after: draft.accent,
			...(draft.accent === '' ? { note: RETURN_TO } : {}),
			swatch: draft.accent || undefined,
			featured: false
		});
	}

	style('Letras', saved.fonts, draft.fonts, (code) => nameOf(FONT_OPTIONS, code));
	style('Esquinas', saved.corners, draft.corners, (code) => nameOf(CORNER_OPTIONS, code));
	style('Estilo de la imagen de arriba', saved.hero, draft.hero, (code) =>
		nameOf(HERO_OPTIONS, code)
	);

	// 2. Marca: nombre de la tienda y barra de anuncio.
	text('marca', 'Nombre de la tienda', saved.storeName, draft.storeName);
	text('marca', 'Barra de anuncio', saved.announcement, draft.announcement);

	// 3. Portada: colección destacada, título y texto de apoyo.
	if (saved.heroCollectionId !== draft.heroCollectionId) {
		const kind =
			saved.heroCollectionId === '' ? 'agrega' : draft.heroCollectionId === '' ? 'quita' : 'cambia';

		changes.push({
			section: 'portada',
			field: 'Colección destacada',
			kind,
			antes: collectionName(saved.heroCollectionId),
			after: collectionName(draft.heroCollectionId),
			featured: true
		});
	}

	text('portada', 'Título de la portada', saved.heroTitle, draft.heroTitle);
	text('portada', 'Texto de la portada', saved.heroSubtitle, draft.heroSubtitle);

	return changes;
}

export type ChangesMode = 'guardar' | 'descartar';

/** Lo que se muestra de un valor; si está vacío, la nota o «vacío». */
function valorDe(value: string, note?: string): string {
	if (value !== '') return value;

	return note ?? 'vacío';
}

/**
 * La frase de un cambio. Al guardar: «Cambia», «Agrega» o «Quita». Al descartar,
 * lo que se pierde: «Se pierde: Color #111111 → #6D28D9».
 */
export function changeText(change: DesignChange, mode: ChangesMode): string {
	if (mode === 'descartar') {
		return `Se pierde: ${change.field} ${valorDe(change.antes)} → ${valorDe(change.after, change.note)}`;
	}

	switch (change.kind) {
		case 'cambia':
			return `Cambia ${change.field}: «${change.antes}» → «${change.after}»`;
		case 'agrega':
			return `Agrega ${change.field}: «${change.after}»`;
		case 'quita':
			return change.note ? `Quita ${change.field} · ${change.note}` : `Quita ${change.field}`;
	}
}
