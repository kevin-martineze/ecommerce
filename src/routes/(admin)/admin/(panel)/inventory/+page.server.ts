// Tipos
import type { Actions, PageServerLoad } from './$types';

// Servidor
import { listInventory, removeVariant, updateVariant } from '$lib/server/api/panel-catalog';
import { failWith, orFail, panelContext } from '$lib/server/context';
import { parseForm } from '$lib/server/form';

// Dominio
import { stockUpdateSchema } from '$lib/schemas/admin';

export const load: PageServerLoad = async (event) => {
	const onlyLow = event.url.searchParams.get('low') === '1';

	// Agrupado por producto, empezando por lo que está por agotarse, para editar
	// como quien revisa el perchero.
	return { groups: orFail(await listInventory(panelContext(event), onlyLow)), onlyLow };
};

export const actions: Actions = {
	stock: async (event) => {
		const ctx = panelContext(event);
		const form = await parseForm(event, stockUpdateSchema);

		if (!form.ok) return form.failure;

		const result = await updateVariant(ctx, form.data.variantId, { stock: form.data.stock });

		if (!result.ok) return failWith(result);

		return { message: 'Stock actualizado.' };
	},

	delete: async (event) => {
		const ctx = panelContext(event);
		const formData = await event.request.formData();

		// Si la variante está en un pedido, la API la desactiva en vez de borrarla.
		const result = await removeVariant(ctx, String(formData.get('variantId') ?? ''));

		if (!result.ok) return failWith(result);

		return {
			message:
				result.data.result === 'deactivated'
					? 'Variante desactivada: está en pedidos.'
					: 'Variante borrada.'
		};
	}
};
