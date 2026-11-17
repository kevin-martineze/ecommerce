// Recursos
import catalogMobile300 from '$lib/assets/marketing/store-catalog-mobile-300.webp';
import catalogMobile600 from '$lib/assets/marketing/store-catalog-mobile-600.webp';
import cover1920 from '$lib/assets/marketing/store-cover-1920.webp';
import cover960 from '$lib/assets/marketing/store-cover-960.webp';
import highlights1920 from '$lib/assets/marketing/store-highlights-1920.webp';
import highlights960 from '$lib/assets/marketing/store-highlights-960.webp';
import productMobile300 from '$lib/assets/marketing/store-product-mobile-300.webp';
import productMobile600 from '$lib/assets/marketing/store-product-mobile-600.webp';

/**
 * Las capturas de la tienda de ejemplo que enseña el sitio comercial.
 *
 * Salen de `scripts/marketing-screenshots.mjs`: si se regeneran con otros
 * tamaños, se ajustan aquí `width` y `height`, que son los del archivo
 * pequeño (el grande es el doble).
 */
export interface Shot {
	src: string;
	srcset: string;
	width: number;
	height: number;
	alt: string;
}

export function shot(
	small: string,
	large: string,
	width: number,
	height: number,
	alt: string
): Shot {
	return { src: small, srcset: `${small} ${width}w, ${large} ${width * 2}w`, width, height, alt };
}

export const SHOT_COVER = shot(
	cover960,
	cover1920,
	960,
	600,
	'Portada de una tienda Globerce de ropa: la colección de temporada con una foto grande.'
);

export const SHOT_HIGHLIGHTS = shot(
	highlights960,
	highlights1920,
	960,
	438,
	'Los productos destacados de una tienda Globerce, con fotos, precios y descuentos.'
);

export const SHOT_CATALOG_MOBILE = shot(
	catalogMobile300,
	catalogMobile600,
	300,
	649,
	'El catálogo de la tienda en un celular, con filtros y precios.'
);

export const SHOT_PRODUCT_MOBILE = shot(
	productMobile300,
	productMobile600,
	300,
	649,
	'La ficha de un producto en un celular, con su precio de oferta y el botón para agregar.'
);
