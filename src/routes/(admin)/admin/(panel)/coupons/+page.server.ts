// Tipos
import type { Actions, PageServerLoad } from './$types';

// Svelte
import { fail } from '@sveltejs/kit';

// Servidor
import {
	createCoupon,
	listCoupons,
	removeCoupon,
	setCouponActive
} from '$lib/server/api/panel-commerce';
import { failWith, orFail, panelContext } from '$lib/server/context';
import { parseForm } from '$lib/server/form';

// Dominio
import { couponSchema, idFormSchema, toggleFormSchema } from '$lib/schemas/admin';

export const load: PageServerLoad = async (event) => {
	return { coupons: orFail(await listCoupons(panelContext(event))) };
};

export const actions: Actions = {
	create: async (event) => {
		const ctx = panelContext(event);
		const form = await parseForm(event, couponSchema);

		if (!form.ok) return form.failure;

		const result = await createCoupon(ctx, form.data);

		if (!result.ok) return failWith(result);

		return { message: 'Cupón creado.' };
	},

	toggle: async (event) => {
		const ctx = panelContext(event);
		const form = await parseForm(event, toggleFormSchema);

		if (!form.ok) return form.failure;

		const result = await setCouponActive(ctx, form.data.id, form.data.active);

		if (!result.ok) return failWith(result);

		return { message: 'Cupón actualizado.' };
	},

	delete: async (event) => {
		const ctx = panelContext(event);
		const form = await parseForm(event, idFormSchema);

		if (!form.ok) return form.failure;

		const result = await removeCoupon(ctx, form.data.id);

		if (!result.ok) return failWith(result);

		if (result.data.result === 'deactivated') {
			return fail(409, { error: 'Ese cupón ya se usó, así que lo desactivamos.' });
		}

		return { message: 'Cupón eliminado.' };
	}
};
