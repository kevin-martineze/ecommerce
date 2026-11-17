// Tipos
import type { Actions, PageServerLoad } from './$types';

// Servidor
import { listRestock, markRestockNotified } from '$lib/server/api/panel-commerce';
import { failWith, orFail, panelContext } from '$lib/server/context';
import { parseForm } from '$lib/server/form';

// Dominio
import { idFormSchema } from '$lib/schemas/admin';

// Utilidades
import { buildRestockUrl } from '$lib/utils/whatsapp';

export const load: PageServerLoad = async (event) => {
	const { settings } = await event.parent();
	const requests = orFail(await listRestock(panelContext(event)));
	const siteUrl = settings.public_url;

	return {
		requests: requests.map((request) => {
			const product = request.variants.products;
			const productUrl = new URL(`/shop/${product.slug}`, siteUrl).toString();

			return {
				...request,
				// Solo tiene sentido escribirle si la variación volvió a tener stock.
				backInStock: request.variants.stock > 0,
				chatUrl: buildRestockUrl(
					request.contact,
					settings.store_name,
					product.name,
					request.variants.variant_label,
					productUrl
				)
			};
		})
	};
};

export const actions: Actions = {
	notified: async (event) => {
		const ctx = panelContext(event);
		const form = await parseForm(event, idFormSchema);

		if (!form.ok) return form.failure;

		const result = await markRestockNotified(ctx, form.data.id, true);

		if (!result.ok) return failWith(result);

		return { message: 'Aviso marcado como notificado.' };
	}
};
