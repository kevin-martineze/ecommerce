// Dominio
import { HEX_COLOR, readableOn } from '$lib/domain/theme';

/**
 * Lo que ven WhatsApp, Instagram y compañía al compartir un enlace de la
 * vitrina: nombre, descripción e imagen de la tienda, nunca los de Globerce.
 *
 * Los rastreadores no resuelven direcciones relativas ni ejecutan JavaScript,
 * así que todo sale en URL absoluta y desde el HTML del servidor.
 */
export interface SharePreview {
	/** Lo que encabeza la tarjeta. */
	title: string;
	description: string;
	/** El nombre de la tienda: WhatsApp lo pinta sobre el título. */
	siteName: string;
	/** La dirección canónica de lo que se comparte. */
	url: string;
	/** Absoluta. Null: la tarjeta sale sin imagen. */
	image: string | null;
	/** Una foto ancha va a lo grande; un logo, en cuadrito. */
	card: 'summary_large_image' | 'summary';
	type: 'website' | 'product';
}

/** Por qué se eligió esa imagen: decide si la tarjeta va grande o chica. */
export type ShareImageSource = 'hero' | 'logo' | 'product' | 'none';

/**
 * `url` resuelta contra `base`, solo si queda en http(s). Una dirección rota
 * o de otro esquema (`data:`, `javascript:`) no sirve para compartir: null.
 */
export function absoluteUrl(url: string | null | undefined, base: string): string | null {
	if (!url) return null;

	try {
		const resolved = new URL(url, base);

		return resolved.protocol === 'http:' || resolved.protocol === 'https:' ? resolved.href : null;
	} catch {
		return null;
	}
}

/**
 * La imagen de la portada al compartir: la foto de la colección del hero,
 * que es lo que la dueña eligió para presentarse; si no hay, el logo; y si
 * tampoco, la foto del producto más nuevo, que siempre es mejor que nada.
 */
export function pickShareImage(
	input: {
		heroImage: string | null | undefined;
		logoUrl: string | null | undefined;
		productImage: string | null | undefined;
	},
	base: string
): { image: string | null; source: ShareImageSource } {
	const candidates: [ShareImageSource, string | null | undefined][] = [
		['hero', input.heroImage],
		['logo', input.logoUrl],
		['product', input.productImage]
	];

	for (const [source, url] of candidates) {
		const image = absoluteUrl(url, base);
		if (image) return { image, source };
	}

	return { image: null, source: 'none' };
}

/** Lo que se dice de la tienda si no hay un texto propio. */
export function defaultStoreDescription(storeName: string): string {
	return `Productos seleccionados de ${storeName}. Pide por WhatsApp: te confirmamos disponibilidad y envío.`;
}

/** Recorta en la última palabra que quepa: las tarjetas cortan solas y feo. */
export function clampText(text: string, max = 200): string {
	const clean = text.replace(/\s+/g, ' ').trim();

	if (clean.length <= max) return clean;

	const cut = clean.slice(0, max - 1);
	const lastSpace = cut.lastIndexOf(' ');

	return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:]+$/, '')}…`;
}

/** La tarjeta de la portada de la tienda. */
export function storeSharePreview(input: {
	storeName: string;
	/** Dirección pública de la tienda (dominio propio o subdominio). */
	publicUrl: string;
	/** La colección del hero: su foto y su texto presentan la tienda. */
	hero: { name: string; description: string | null; hero_image_url: string | null } | null;
	/** El subtítulo de ajustes, si no hay colección en el hero. */
	heroSubtitle: string | null;
	logoUrl: string | null;
	/** Foto del producto más nuevo: último recurso para la imagen. */
	productImage: string | null;
}): SharePreview {
	const url = absoluteUrl('/', input.publicUrl) ?? input.publicUrl;
	const { image, source } = pickShareImage(
		{
			heroImage: input.hero?.hero_image_url,
			logoUrl: input.logoUrl,
			productImage: input.productImage
		},
		url
	);
	const own = [input.hero?.description, input.heroSubtitle].find(
		(text): text is string => typeof text === 'string' && text.trim().length > 0
	);

	return {
		title: input.hero ? `${input.storeName} — ${input.hero.name}` : input.storeName,
		description: clampText(own ?? defaultStoreDescription(input.storeName)),
		siteName: input.storeName,
		url,
		image,
		card: source === 'logo' || source === 'none' ? 'summary' : 'summary_large_image',
		type: 'website'
	};
}

/** La tarjeta de la ficha de un producto. */
export function productSharePreview(input: {
	storeName: string;
	/** La dirección pública de la ficha. */
	url: string;
	name: string;
	description: string | null;
	image: string | null;
	logoUrl: string | null;
}): SharePreview {
	const { image, source } = pickShareImage(
		{ heroImage: input.image, logoUrl: input.logoUrl, productImage: null },
		input.url
	);

	return {
		title: input.name,
		description: clampText(input.description?.trim() || `${input.name} en ${input.storeName}.`),
		siteName: input.storeName,
		url: input.url,
		image,
		card: source === 'hero' ? 'summary_large_image' : 'summary',
		type: 'product'
	};
}

/** Un icono de pestaña: dirección y tipo, para `<link rel="icon">`. */
export interface StoreIcon {
	href: string;
	type: string | null;
	/** Solo con logo: iOS no acepta SVG para la pantalla de inicio. */
	appleTouch: string | null;
}

/**
 * El icono de la pestaña de la vitrina: el ícono cuadrado de la tienda; sin
 * él, su logo; sin logo, su inicial sobre el color de la marca. Nunca el de
 * Globerce.
 */
export function storeIcon(input: {
	storeName: string;
	iconUrl: string | null;
	logoUrl: string | null;
	accent: string | null;
	publicUrl: string;
}): StoreIcon {
	// La API lo guarda como PNG cuadrado: sirve también para iOS.
	const icon = absoluteUrl(input.iconUrl, input.publicUrl);

	if (icon) return { href: icon, type: 'image/png', appleTouch: icon };

	const logo = absoluteUrl(input.logoUrl, input.publicUrl);

	if (logo) return { href: logo, type: null, appleTouch: logo };

	const background = input.accent && HEX_COLOR.test(input.accent) ? input.accent : '#111111';
	const initial = escapeXml(
		Array.from(input.storeName.trim()).at(0)?.toLocaleUpperCase('es') ?? '·'
	);
	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
		`<rect width="64" height="64" rx="14" fill="${background}"/>` +
		`<text x="32" y="44" font-family="Georgia,serif" font-size="38" text-anchor="middle" fill="${readableOn(background)}">${initial}</text>` +
		`</svg>`;

	return {
		href: `data:image/svg+xml,${encodeURIComponent(svg)}`,
		type: 'image/svg+xml',
		appleTouch: null
	};
}

function escapeXml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
