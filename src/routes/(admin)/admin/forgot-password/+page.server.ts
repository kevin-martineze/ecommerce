// Tipos
import type { Actions } from './$types';

// Svelte
import { fail } from '@sveltejs/kit';

// Servidor
import { forgotPassword } from '$lib/server/api/auth';
import { clientAddress, displayStatus } from '$lib/server/context';
import { parseForm } from '$lib/server/form';

// Dominio
import { forgotPasswordSchema } from '$lib/schemas/account';

export const actions: Actions = {
	default: async (event) => {
		const form = await parseForm(event, forgotPasswordSchema);

		if (!form.ok) return form.failure;

		const result = await forgotPassword(form.data.email, clientAddress(event));

		// Solo fallan el límite de intentos o la red: exista o no la cuenta, la
		// respuesta es la misma, para no revelar qué correos tienen cuenta.
		if (!result.ok) return fail(displayStatus(result), { error: result.message });

		return { sent: true, email: form.data.email };
	}
};
