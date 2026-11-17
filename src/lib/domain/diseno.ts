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
export const SECCIONES = ['estilo', 'marca', 'portada'] as const;

export type Seccion = (typeof SECCIONES)[number];

/** La sección que se ve, leída de `?section=`. Si falta o no existe: estilo. */
export function seccionDe(search: string): Seccion {
	const valor = new URLSearchParams(search).get('section');

	return SECCIONES.find((seccion) => seccion === valor) ?? 'estilo';
}

/** La zona que la vista previa resalta al entrar en cada sección. */
export function focoDe(seccion: Seccion): PreviewZone | null {
	switch (seccion) {
		case 'estilo':
			return null;
		case 'marca':
			return 'store-header';
		case 'portada':
			return 'hero';
	}
}

/** Todo lo que el editor muestra en vivo: un solo borrador para la vista previa. */
export interface BorradorDiseno {
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
	foco: PreviewZone | null;
}

/**
 * Arma el borrador que la tienda pinta. Va en un solo `content` de tipo `home`,
 * que lleva también el nombre y el anuncio: así la vista previa muestra todo junto.
 */
export function armarBorrador(borrador: BorradorDiseno): StorefrontDraft {
	return {
		template: borrador.template,
		theme: readTheme({
			accent: borrador.accent,
			fonts: borrador.fonts,
			corners: borrador.corners,
			hero: borrador.hero
		}),
		content: {
			kind: 'home',
			heroCollectionId: borrador.heroCollectionId || null,
			heroTitle: borrador.heroTitle,
			heroSubtitle: borrador.heroSubtitle,
			highlights: borrador.highlights,
			storeName: borrador.storeName,
			announcement: borrador.announcement
		},
		focus: borrador.foco
	};
}
