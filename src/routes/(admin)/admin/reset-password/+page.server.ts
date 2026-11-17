// Tipos
import type { Actions, PageServerLoad } from './$types';

// Svelte
import { fail, redirect } from '@sveltejs/kit';

// Servidor
import { resetPassword } from '$lib/server/api/auth';
import { clientAddress, displayStatus } from '$lib/server/context';
import { parseForm } from '$lib/server/form';
import { clearSession } from '$lib/server/session';

// Dominio
import { resetPasswordSchema } from '$lib/schemas/account';

export const load: PageServerLoad = ({ url }) => {
	return { token: url.searchParams.get('token') ?? '' };
};

export const actions: Actions = {
	default: async (event) => {
		const form = await parseForm(event, resetPasswordSchema);

		if (!form.ok) return form.failure;

		const result = await resetPassword(form.data.token, form.data.password, clientAddress(event));

		if (!result.ok) return fail(displayStatus(result), { error: result.message });

		// La API cerró todas las sesiones de la cuenta; la de este navegador también.
		clearSession(event.cookies);
		redirect(303, '/admin/login?notice=password-reset');
	}
};
