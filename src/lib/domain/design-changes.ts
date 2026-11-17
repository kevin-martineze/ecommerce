// Tipos
import type { Seccion } from '$lib/domain/diseno';
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
	seccion: Seccion;
	campo: string;
	tipo: 'cambia' | 'agrega' | 'quita';
	antes: string;
	despues: string;
	/** Frase extra, por ejemplo «Vuelve a lo que trae la plantilla». */
	nota?: string;
	/** Hex a mostrar como muestra de color. */
	swatch?: string;
	/** Cambios que se notan mucho en la tienda: la plantilla y la colección destacada. */
	destacado: boolean;
}

/** Lo que se muestra de un texto largo: 60 caracteres y «…» si se corta. */
const LARGO = 60;

export function recortar(texto: string): string {
	if (texto.length <= LARGO) return texto;

	return `${texto.slice(0, LARGO - 1).trimEnd()}…`;
}

const VOLVER = 'Vuelve a lo que trae la plantilla';

function nombreDe(options: { code: string; name: string }[], code: string): string {
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
	guardado: DesignSnapshot,
	borrador: DesignSnapshot,
	colecciones: DesignCollection[]
): DesignChange[] {
	const cambios: DesignChange[] = [];

	const nombreColeccion = (id: string) =>
		id === '' ? 'Ninguna' : (colecciones.find((coleccion) => coleccion.id === id)?.name ?? id);

	/** Un campo de texto libre (nombre, anuncio, título, texto). */
	function texto(seccion: Seccion, campo: string, antes: string, despues: string): void {
		if (antes === despues) return;

		const tipo = antes === '' ? 'agrega' : despues === '' ? 'quita' : 'cambia';

		cambios.push({
			seccion,
			campo,
			tipo,
			antes: recortar(antes),
			despues: recortar(despues),
			destacado: false
		});
	}

	/** Un ajuste de estilo con opciones: '' es «De la plantilla». */
	function estilo(
		campo: string,
		antes: string,
		despues: string,
		etiqueta: (code: string) => string
	): void {
		if (antes === despues) return;

		if (despues === '') {
			cambios.push({
				seccion: 'estilo',
				campo,
				tipo: 'quita',
				antes: etiqueta(antes),
				despues: '',
				nota: VOLVER,
				destacado: false
			});
			return;
		}

		cambios.push({
			seccion: 'estilo',
			campo,
			tipo: antes === '' ? 'agrega' : 'cambia',
			antes: antes === '' ? '' : etiqueta(antes),
			despues: etiqueta(despues),
			destacado: false
		});
	}

	// 1. Estilo: plantilla, color, letras, esquinas y el estilo de la imagen de arriba.
	if (guardado.template !== borrador.template) {
		cambios.push({
			seccion: 'estilo',
			campo: 'Plantilla',
			tipo: 'cambia',
			antes: templateOf(guardado.template).name,
			despues: templateOf(borrador.template).name,
			destacado: true
		});
	}

	if (guardado.accent !== borrador.accent) {
		const tipo = guardado.accent === '' ? 'agrega' : borrador.accent === '' ? 'quita' : 'cambia';

		cambios.push({
			seccion: 'estilo',
			campo: 'Color',
			tipo,
			antes: guardado.accent,
			despues: borrador.accent,
			...(borrador.accent === '' ? { nota: VOLVER } : {}),
			swatch: borrador.accent || undefined,
			destacado: false
		});
	}

	estilo('Letras', guardado.fonts, borrador.fonts, (code) => nombreDe(FONT_OPTIONS, code));
	estilo('Esquinas', guardado.corners, borrador.corners, (code) => nombreDe(CORNER_OPTIONS, code));
	estilo('Estilo de la imagen de arriba', guardado.hero, borrador.hero, (code) =>
		nombreDe(HERO_OPTIONS, code)
	);

	// 2. Marca: nombre de la tienda y barra de anuncio.
	texto('marca', 'Nombre de la tienda', guardado.storeName, borrador.storeName);
	texto('marca', 'Barra de anuncio', guardado.announcement, borrador.announcement);

	// 3. Portada: colección destacada, título y texto de apoyo.
	if (guardado.heroCollectionId !== borrador.heroCollectionId) {
		const tipo =
			guardado.heroCollectionId === ''
				? 'agrega'
				: borrador.heroCollectionId === ''
					? 'quita'
					: 'cambia';

		cambios.push({
			seccion: 'portada',
			campo: 'Colección destacada',
			tipo,
			antes: nombreColeccion(guardado.heroCollectionId),
			despues: nombreColeccion(borrador.heroCollectionId),
			destacado: true
		});
	}

	texto('portada', 'Título de la portada', guardado.heroTitle, borrador.heroTitle);
	texto('portada', 'Texto de la portada', guardado.heroSubtitle, borrador.heroSubtitle);

	return cambios;
}

export type ModoCambios = 'guardar' | 'descartar';

/** Lo que se muestra de un valor; si está vacío, la nota o «vacío». */
function valorDe(valor: string, nota?: string): string {
	if (valor !== '') return valor;

	return nota ?? 'vacío';
}

/**
 * La frase de un cambio. Al guardar: «Cambia», «Agrega» o «Quita». Al descartar,
 * lo que se pierde: «Se pierde: Color #111111 → #6D28D9».
 */
export function textoDelCambio(cambio: DesignChange, modo: ModoCambios): string {
	if (modo === 'descartar') {
		return `Se pierde: ${cambio.campo} ${valorDe(cambio.antes)} → ${valorDe(cambio.despues, cambio.nota)}`;
	}

	switch (cambio.tipo) {
		case 'cambia':
			return `Cambia ${cambio.campo}: «${cambio.antes}» → «${cambio.despues}»`;
		case 'agrega':
			return `Agrega ${cambio.campo}: «${cambio.despues}»`;
		case 'quita':
			return cambio.nota ? `Quita ${cambio.campo} · ${cambio.nota}` : `Quita ${cambio.campo}`;
	}
}
