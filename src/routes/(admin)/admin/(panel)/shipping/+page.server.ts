// Tipos
import type { ZoneInput } from '$lib/server/api/panel-commerce';
import type { Actions, PageServerLoad } from './$types';

// Svelte
import { fail } from '@sveltejs/kit';

// Servidor
import { createZone, listZones, removeZone, updateZone } from '$lib/server/api/panel-commerce';
import { failWith, orFail, panelContext } from '$lib/server/context';
import { parseForm } from '$lib/server/form';

// Dominio
import { shippingZoneSchema, idFormSchema } from '$lib/schemas/admin';
import { formId } from '$lib/schemas/fields';

export const load: PageServerLoad = async (event) => {
	return { zones: orFail(await listZones(panelContext(event))) };
};

function toInput(zone: {
	name: string;
	cost: number;
	etaDays?: number | null;
	active: boolean;
	sortOrder: number;
}): ZoneInput {
	return {
		name: zone.name,
		cost: zone.cost,
		etaDays: zone.etaDays ?? null,
		active: zone.active,
		sortOrder: zone.sortOrder
	};
}

export const actions: Actions = {
	create: async (event) => {
		const ctx = panelContext(event);
		const form = await parseForm(event, shippingZoneSchema);

		if (!form.ok) return form.failure;

		const result = await createZone(ctx, toInput(form.data));

		if (!result.ok) return failWith(result);

		return { message: 'Zona de envío creada.' };
	},

	update: async (event) => {
		const ctx = panelContext(event);
		const form = await parseForm(event, shippingZoneSchema.extend({ id: formId }));

		if (!form.ok) return form.failure;

		const result = await updateZone(ctx, form.data.id, toInput(form.data));

		if (!result.ok) return failWith(result);

		return { message: 'Zona de envío actualizada.' };
	},

	delete: async (event) => {
		const ctx = panelContext(event);
		const form = await parseForm(event, idFormSchema);

		if (!form.ok) return form.failure;

		const result = await removeZone(ctx, form.data.id);

		if (!result.ok) return failWith(result);

		if (result.data.result === 'deactivated') {
			return fail(409, { error: 'Esa zona ya se usó en pedidos, así que la desactivamos.' });
		}

		return { message: 'Zona de envío eliminada.' };
	}
};
