// Tipos
import type { RequestHandler } from './$types';

// Svelte
import { redirect } from '@sveltejs/kit';

// Servidor
import { getStorefront } from '$lib/server/api/storefront';
import { publicContext } from '$lib/server/context';
import { movedStoreLocation } from '$lib/server/moved-store';

export const GET: RequestHandler = async (event) => {
	const result = await getStorefront(publicContext(event));

	if (!result.ok) {
		// Un subdominio que la tienda dejó manda al buscador a su robots nuevo.
		if (result.status === 404) {
			const moved = await movedStoreLocation(event);

			if (moved) redirect(308, moved);
		}

		return new Response('No pudimos armar robots.txt.', {
			status: 503,
			headers: { 'retry-after': '300' }
		});
	}

	const site = result.data.public_url.replace(/\/$/, '');

	// El panel, el carrito y los pedidos no se indexan.
	const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /cart
Disallow: /order
Disallow: /favorites
Disallow: /preview

Sitemap: ${site}/sitemap.xml
`;

	return new Response(body, { headers: { 'content-type': 'text/plain' } });
};
