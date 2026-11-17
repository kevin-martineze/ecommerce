// Tipos
import type { Actions, PageServerLoad } from './$types';

// Svelte
import { fail } from '@sveltejs/kit';

// Servidor
import { getSettings, updateSettings } from '$lib/server/api/panel-content';
import { failWith, orFail, panelContext } from '$lib/server/context';

// Dominio
import { adjustmentsSchema } from '$lib/schemas/admin';

export const load: PageServerLoad = async (event) => {
	return { current: orFail(await getSettings(panelContext(event))) };
};

/**
 * Lo de Ajustes: WhatsApp, Instagram y el envío gratis. La marca (nombre, logo,
 * anuncio) y el diseño están en Diseño.
 */
export const actions: Actions = {
	save: async (event) => {
		const ctx = panelContext(event);
		const formData = await event.request.formData();

		const parsed = adjustmentsSchema.safeParse({
			whatsappPhone: String(formData.get('whatsappPhone') ?? '').replace(/\D/g, ''),
			instagramUrl: formData.get('instagramUrl') ?? '',
			freeShippingThreshold: String(formData.get('freeShippingThreshold') ?? '') || null
		});

		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues.at(0)?.message ?? 'Revisa los datos.' });
		}

		const input = parsed.data;

		// La API cambia solo lo que viene: aquí van los tres campos de Ajustes y nada más.
		const result = await updateSettings(ctx, {
			whatsappPhone: input.whatsappPhone,
			instagramUrl: input.instagramUrl || null,
			freeShippingThreshold: input.freeShippingThreshold || null
		});

		if (!result.ok) return failWith(result);

		return { message: 'Ajustes guardados.' };
	}
};
