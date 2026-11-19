// Tipos
import type { Actions, PageServerLoad } from './$types';

// Svelte
import { fail, redirect } from '@sveltejs/kit';

// Servidor
import { deleteUser, getUser, setUserDisabled } from '$lib/server/api/platform';
import { accountContext, failWith, orFail } from '$lib/server/context';

// Dominio
import { deleteUserSchema, userDisabledSchema } from '$lib/schemas/platform';

export const load: PageServerLoad = async (event) => {
	const ctx = accountContext(event);

	return { user: orFail(await getUser(ctx, event.params.id)) };
};

export const actions: Actions = {
	status: async (event) => {
		const ctx = accountContext(event);
		const formData = await event.request.formData();
		const disabled = userDisabledSchema.safeParse(formData.get('disabled'));

		if (!disabled.success) return fail(400, { error: disabled.error.issues[0]?.message });

		const result = await setUserDisabled(ctx, event.params.id, disabled.data === 'true');

		if (!result.ok) return failWith(result);

		return {
			message:
				disabled.data === 'true'
					? 'Cuenta deshabilitada: se cerraron sus sesiones y ya no puede entrar.'
					: 'Cuenta reactivada.'
		};
	},

	delete: async (event) => {
		const ctx = accountContext(event);
		const formData = await event.request.formData();
		const parsed = deleteUserSchema.safeParse({
			confirmEmail: formData.get('confirmEmail') ?? '',
			deleteStoreIds: formData.getAll('deleteStoreIds')
		});

		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues.at(0)?.message ?? 'Revisa la confirmación.' });
		}

		const result = await deleteUser(ctx, event.params.id, parsed.data);

		if (!result.ok) return failWith(result);

		redirect(303, '/platform/users');
	}
};
