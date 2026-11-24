// Tipos
import type { RequestEvent } from '@sveltejs/kit';

// Servidor
import { findMovedStore } from '$lib/server/api/storefront';
import { clientAddress } from '$lib/server/context';
import { serverEnv } from '$lib/server/env';

// Utilidades
import { movedStoreUrl, parsePlatformHosts, resolveHost } from '$lib/tenant';

type MovedStoreEvent = Pick<RequestEvent, 'getClientAddress' | 'locals' | 'url'>;

/**
 * El mismo camino en el subdominio nuevo, si el del host es uno que una tienda
 * dejó; `null` si no. Solo le pregunta a la API en un subdominio de tienda: un
 * dominio propio ya trae su tienda resuelta y el host de la plataforma no se
 * muda. Quien la llama lo hace cuando la tienda del host no aparece, así una
 * visita normal no paga la consulta.
 */
export async function movedStoreLocation(event: MovedStoreEvent): Promise<string | null> {
	if (event.locals.storeSlug) return null;

	const env = serverEnv();
	const platformHosts = parsePlatformHosts(env.PUBLIC_PLATFORM_HOSTS);
	const target = resolveHost(event.url.host, env.PUBLIC_STORE_ROOT_DOMAIN, platformHosts);

	if (target.kind !== 'store') return null;

	const found = await findMovedStore(target.slug, clientAddress(event));

	if (!found.ok) return null;

	return movedStoreUrl(
		event.url,
		found.data.slug,
		env.PUBLIC_STORE_ROOT_DOMAIN,
		env.PUBLIC_SITE_URL,
		platformHosts
	);
}
