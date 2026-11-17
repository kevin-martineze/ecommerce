// Tipos
import type { DraftHighlight, PreviewZone, StorefrontDraft } from '$lib/domain/preview';
import type { StorefrontTemplate } from '$lib/domain/templates';

// Dominio
import { readTheme } from '$lib/domain/theme';

/**
 * Las secciones del editor de Diseño. Cada una agrupa lo que cambia la tienda:
 * el estilo (plantilla, color, letras, esquinas, portada en plantilla), la
 * marca (nombre, logo, anuncio) y la portada (imagen de arriba y mensajes).
 */
export const SECTIONS = ['estilo', 'marca', 'portada'] as const;

export type Section = (typeof SECTIONS)[number];

/** La sección que se ve, leída de `?section=`. Si falta o no existe: estilo. */
export function sectionFrom(search: string): Section {
	const value = new URLSearchParams(search).get('section');

	return SECTIONS.find((section) => section === value) ?? 'estilo';
}

/** La zona que la vista previa resalta al entrar en cada sección. */
export function focusFor(section: Section): PreviewZone | null {
	switch (section) {
		case 'estilo':
			return null;
		case 'marca':
			return 'store-header';
		case 'portada':
			return 'hero';
	}
}

/** Todo lo que el editor muestra en vivo: un solo borrador para la vista previa. */
export interface DesignDraft {
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
	highlights: DraftHighlight[];
	focusZone: PreviewZone | null;
}

/**
 * Arma el borrador que la tienda pinta. Va en un solo `content` de tipo `home`,
 * que lleva también el nombre y el anuncio: así la vista previa muestra todo junto.
 */
export function buildDraft(draft: DesignDraft): StorefrontDraft {
	return {
		template: draft.template,
		theme: readTheme({
			accent: draft.accent,
			fonts: draft.fonts,
			corners: draft.corners,
			hero: draft.hero
		}),
		content: {
			kind: 'home',
			heroCollectionId: draft.heroCollectionId || null,
			heroTitle: draft.heroTitle,
			heroSubtitle: draft.heroSubtitle,
			highlights: draft.highlights,
			storeName: draft.storeName,
			announcement: draft.announcement
		},
		focus: draft.focusZone
	};
}
