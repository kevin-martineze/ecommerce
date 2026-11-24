// Tipos
import type { RequestEvent } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Svelte
import { error, redirect } from '@sveltejs/kit';

// Servidor
import { findMovedStore, getStorefront } from '$lib/server/api/storefront';
import { clientAddress, publicContext, storeSlugFor } from '$lib/server/context';
import { serverEnv } from '$lib/server/env';
import { resolveTemplatePreview } from '$lib/server/template-preview';

// Utilidades
import { isPreview, redirectToCustomDomain } from '$lib/custom-domain';
import { movedStoreUrl, parsePlatformHosts } from '$lib/tenant';

export const load: LayoutServerLoad = async (event) => {
	const result = await getStorefront(publicContext(event));

	if (!result.ok) {
		if (result.status === 404) {
			// Un subdominio que la tienda dejó sigue llevando a ella. Es un 308:
			// la mudanza es para siempre y así los buscadores pasan al nuevo.
			const moved = await movedStoreLocation(event);

			if (moved) redirect(308, moved);
			error(404, 'Esta tienda no existe.');
		}

		error(503, result.message);
	}

	// Una plantilla en prueba viste esta visita y nada más: la de verdad sigue
	// en la API hasta que la dueña la elija en el panel.
	const preview = resolveTemplatePreview(event.url, event.cookies);

	// Si la tienda ya tiene dominio propio activo, el subdominio le manda a él,
	// salvo en vistas previas: el panel las carga en un iframe del subdominio y
	// un salto a otro sitio rompe el borrador. Es un 302: si después se quita el
	// dominio, el subdominio vuelve a servir.
	const env = serverEnv();
	const moved = redirectToCustomDomain({
		currentHost: event.url.host,
		publicUrl: result.data.public_url,
		pathname: event.url.pathname,
		search: event.url.search,
		rootDomain: env.PUBLIC_STORE_ROOT_DOMAIN,
		platformHosts: parsePlatformHosts(env.PUBLIC_PLATFORM_HOSTS),
		skip: isPreview({
			secFetchDest: event.request.headers.get('sec-fetch-dest'),
			pathname: event.url.pathname,
			preview: preview.template !== null || preview.theme !== null
		})
	});

	if (moved) redirect(302, moved);

	const settings = {
		...result.data.settings,
		template: preview.template ?? result.data.settings.template,
		theme: preview.theme ?? result.data.settings.theme
	};

	return {
		...result.data,
		settings,
		previewTemplate: preview.announce ? preview.template : null,
		// Abierta por el editor de diseño: escucha el borrador que le mande.
		draftPreview: preview.theme !== null
	};
};

/**
 * El mismo camino en el subdominio nuevo, si el del host es uno que una tienda
 * dejó. Solo se pregunta cuando la tienda no existe: no le cuesta nada a una
 * visita normal. Un dominio propio ya trae su tienda resuelta.
 */
async function movedStoreLocation(
	event: Pick<RequestEvent, 'getClientAddress' | 'locals' | 'url'>
): Promise<string | null> {
	const slug = event.locals.storeSlug ? null : storeSlugFor(event);

	if (!slug) return null;

	const found = await findMovedStore(slug, clientAddress(event));

	if (!found.ok) return null;

	const env = serverEnv();

	return movedStoreUrl(
		event.url,
		found.data.slug,
		env.PUBLIC_STORE_ROOT_DOMAIN,
		env.PUBLIC_SITE_URL,
		parsePlatformHosts(env.PUBLIC_PLATFORM_HOSTS)
	);
}
