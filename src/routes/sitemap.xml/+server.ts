// Tipos
import type { RequestHandler } from './$types';

// Servidor
import { getSitemap, getStorefront } from '$lib/server/api/storefront';
import { publicContext } from '$lib/server/context';

export const GET: RequestHandler = async (event) => {
	const ctx = publicContext(event);
	const [storefront, result] = await Promise.all([getStorefront(ctx), getSitemap(ctx)]);

	// Un 503 con Retry-After hace que el buscador vuelva luego. Un sitemap vacío
	// le diría que la tienda no tiene páginas.
	if (!storefront.ok || !result.ok) {
		return new Response('No pudimos armar el sitemap.', {
			status: 503,
			headers: { 'retry-after': '300' }
		});
	}

	// Las direcciones de la tienda salen de su dirección pública, no de `PUBLIC_SITE_URL`.
	const site = storefront.data.public_url.replace(/\/$/, '');
	const { products, collections, categories } = result.data;

	const urls = [
		{ loc: `${site}/`, lastmod: null },
		{ loc: `${site}/shop`, lastmod: null },
		{ loc: `${site}/collections`, lastmod: null },
		...categories.map((slug) => ({ loc: `${site}/shop?categoria=${slug}`, lastmod: null })),
		...collections.map((slug) => ({ loc: `${site}/collections/${slug}`, lastmod: null })),
		...products.map((product) => ({
			loc: `${site}/shop/${product.slug}`,
			lastmod: product.updatedAt
		}))
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map(
		(url) =>
			`	<url><loc>${url.loc.replace(/&/g, '&amp;')}</loc>${
				url.lastmod ? `<lastmod>${url.lastmod.slice(0, 10)}</lastmod>` : ''
			}</url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(body, {
		headers: {
			'content-type': 'application/xml',
			'cache-control': 'max-age=0, s-maxage=3600'
		}
	});
};
