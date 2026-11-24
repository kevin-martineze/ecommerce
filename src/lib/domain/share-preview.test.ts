// Librerías
import { describe, expect, it } from 'vitest';

// Dominio
import {
	absoluteUrl,
	clampText,
	defaultStoreDescription,
	pickShareImage,
	productSharePreview,
	storeIcon,
	storeSharePreview
} from '$lib/domain/share-preview';

const BASE = 'https://perfumeria.globerce.store';
const HERO = 'https://cdn.example.com/collections/perfumes-originales-full.webp';
const LOGO = 'https://cdn.example.com/logo.webp';
const PRODUCT = 'https://cdn.example.com/products/black-xs-card.webp';

describe('absoluteUrl', () => {
	it('deja igual una dirección absoluta', () => {
		expect(absoluteUrl(HERO, BASE)).toBe(HERO);
	});

	it('resuelve una relativa contra la tienda', () => {
		expect(absoluteUrl('/logo.png', BASE)).toBe(`${BASE}/logo.png`);
	});

	it('descarta lo vacío y lo que no es http(s)', () => {
		expect(absoluteUrl(null, BASE)).toBeNull();
		expect(absoluteUrl('', BASE)).toBeNull();
		expect(absoluteUrl('data:image/png;base64,AAAA', BASE)).toBeNull();
		expect(absoluteUrl('javascript:alert(1)', BASE)).toBeNull();
	});
});

describe('pickShareImage', () => {
	it('prefiere la foto de la colección del hero', () => {
		expect(pickShareImage({ heroImage: HERO, logoUrl: LOGO, productImage: PRODUCT }, BASE)).toEqual(
			{
				image: HERO,
				source: 'hero'
			}
		);
	});

	it('sin foto de hero, usa el logo', () => {
		expect(pickShareImage({ heroImage: null, logoUrl: LOGO, productImage: PRODUCT }, BASE)).toEqual(
			{
				image: LOGO,
				source: 'logo'
			}
		);
	});

	it('sin hero ni logo, la foto del producto más nuevo', () => {
		expect(pickShareImage({ heroImage: null, logoUrl: null, productImage: PRODUCT }, BASE)).toEqual(
			{ image: PRODUCT, source: 'product' }
		);
	});

	it('salta una dirección que no sirve y sigue con la siguiente', () => {
		expect(
			pickShareImage({ heroImage: 'data:x', logoUrl: '/logo.png', productImage: null }, BASE)
		).toEqual({ image: `${BASE}/logo.png`, source: 'logo' });
	});

	it('sin nada, no hay imagen', () => {
		expect(pickShareImage({ heroImage: null, logoUrl: null, productImage: null }, BASE)).toEqual({
			image: null,
			source: 'none'
		});
	});
});

describe('clampText', () => {
	it('deja igual un texto corto y le quita espacios de más', () => {
		expect(clampText('  Perfumes   originales ')).toBe('Perfumes originales');
	});

	it('corta en la última palabra que cabe', () => {
		expect(clampText('uno dos tres cuatro cinco', 14)).toBe('uno dos tres…');
	});
});

describe('storeSharePreview', () => {
	const base = {
		storeName: 'Perfumería',
		publicUrl: `${BASE}/`,
		heroSubtitle: null,
		logoUrl: null,
		productImage: PRODUCT
	};

	it('presenta la tienda con la colección del hero', () => {
		const preview = storeSharePreview({
			...base,
			hero: {
				name: 'Perfumes originales',
				description: 'Fragancias 100 % originales con envío a todo el país.',
				hero_image_url: HERO
			}
		});

		expect(preview).toEqual({
			title: 'Perfumería — Perfumes originales',
			description: 'Fragancias 100 % originales con envío a todo el país.',
			siteName: 'Perfumería',
			url: `${BASE}/`,
			image: HERO,
			card: 'summary_large_image',
			type: 'website'
		});
	});

	it('sin colección ni subtítulo, usa el texto de siempre', () => {
		const preview = storeSharePreview({ ...base, hero: null });

		expect(preview.title).toBe('Perfumería');
		expect(preview.description).toBe(defaultStoreDescription('Perfumería'));
		expect(preview.image).toBe(PRODUCT);
	});

	it('sin descripción en la colección, usa el subtítulo de ajustes', () => {
		const preview = storeSharePreview({
			...base,
			hero: { name: 'Perfumes originales', description: '  ', hero_image_url: null },
			heroSubtitle: 'Originales, con factura.'
		});

		expect(preview.description).toBe('Originales, con factura.');
	});

	it('con el logo como imagen, la tarjeta va en cuadrito', () => {
		const preview = storeSharePreview({ ...base, hero: null, logoUrl: LOGO, productImage: null });

		expect(preview.image).toBe(LOGO);
		expect(preview.card).toBe('summary');
	});

	it('nunca dice Globerce', () => {
		const preview = storeSharePreview({ ...base, hero: null });

		expect(JSON.stringify(preview)).not.toMatch(/globerce(?!\.store)/i);
	});
});

describe('productSharePreview', () => {
	it('usa la foto del producto en grande', () => {
		const preview = productSharePreview({
			storeName: 'Perfumería',
			url: `${BASE}/shop/black-xs`,
			name: 'Black XS 100 ml',
			description: null,
			image: PRODUCT,
			logoUrl: LOGO
		});

		expect(preview).toMatchObject({
			title: 'Black XS 100 ml',
			description: 'Black XS 100 ml en Perfumería.',
			siteName: 'Perfumería',
			image: PRODUCT,
			card: 'summary_large_image',
			type: 'product'
		});
	});

	it('sin foto, cae al logo de la tienda', () => {
		const preview = productSharePreview({
			storeName: 'Perfumería',
			url: `${BASE}/shop/black-xs`,
			name: 'Black XS',
			description: 'Eau de toilette.',
			image: null,
			logoUrl: LOGO
		});

		expect(preview.image).toBe(LOGO);
		expect(preview.card).toBe('summary');
	});
});

describe('storeIcon', () => {
	const ICON = 'https://cdn.example.com/branding/icon.png';

	it('con ícono, el ícono manda sobre el logo, también en iOS', () => {
		expect(
			storeIcon({
				storeName: 'Marte',
				iconUrl: ICON,
				logoUrl: LOGO,
				accent: null,
				publicUrl: BASE
			})
		).toEqual({ href: ICON, type: 'image/png', appleTouch: ICON });
	});

	it('con logo, el logo es el favicon y el icono de iOS', () => {
		expect(
			storeIcon({
				storeName: 'Perfumería',
				iconUrl: null,
				logoUrl: LOGO,
				accent: null,
				publicUrl: BASE
			})
		).toEqual({ href: LOGO, type: null, appleTouch: LOGO });
	});

	it('sin logo, la inicial de la tienda sobre su color', () => {
		const icon = storeIcon({
			storeName: 'perfumería',
			iconUrl: null,
			logoUrl: null,
			accent: '#7A1F3D',
			publicUrl: BASE
		});
		const svg = decodeURIComponent(icon.href.replace('data:image/svg+xml,', ''));

		expect(icon.type).toBe('image/svg+xml');
		expect(icon.appleTouch).toBeNull();
		expect(svg).toContain('fill="#7A1F3D"');
		expect(svg).toContain('>P</text>');
	});

	it('escapa lo que no puede ir crudo en el SVG', () => {
		const icon = storeIcon({
			storeName: '<Tienda>',
			iconUrl: null,
			logoUrl: null,
			accent: 'rojo',
			publicUrl: BASE
		});
		const svg = decodeURIComponent(icon.href.replace('data:image/svg+xml,', ''));

		expect(svg).toContain('>&lt;</text>');
		expect(svg).toContain('fill="#111111"');
	});
});
