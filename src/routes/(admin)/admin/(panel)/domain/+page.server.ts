// Tipos
import type { Actions, PageServerLoad } from './$types';

// Svelte
import { fail, redirect } from '@sveltejs/kit';

// Servidor
import { getDomain, removeDomain, saveDomain, verifyDomain } from '$lib/server/api/panel-domain';
import { failWith, orFail, panelContext } from '$lib/server/context';
import { serverEnv } from '$lib/server/env';

// Dominio
import { dominioSchema } from '$lib/schemas/domain';

/** Dominio propio: solo la dueña (`OWNER`) lo configura. El resto va al inicio del panel. */
export const load: PageServerLoad = async (event) => {
	const { role } = await event.parent();

	if (role !== 'owner') redirect(303, '/admin');

	const state = orFail(await getDomain(panelContext(event)));

	return { allowed: state.allowed, domain: state.domain };
};

export const actions: Actions = {
	save: async (event) => {
		const ctx = panelContext(event);
		const formData = await event.request.formData();

		const parsed = dominioSchema(serverEnv().PUBLIC_STORE_ROOT_DOMAIN).safeParse(
			formData.get('host') ?? ''
		);

		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues.at(0)?.message ?? 'Revisa el dominio.' });
		}

		const result = await saveDomain(ctx, parsed.data);

		if (!result.ok) return failWith(result);

		return { ok: true, message: 'Listo. Ahora pon los registros DNS que te mostramos abajo.' };
	},

	verify: async (event) => {
		const result = await verifyDomain(panelContext(event));

		if (!result.ok) return failWith(result);

		return { ok: true, message: 'Revisamos el DNS.' };
	},

	remove: async (event) => {
		const result = await removeDomain(panelContext(event));

		if (!result.ok) return failWith(result);

		return { ok: true, message: 'Quitamos el dominio. Tu tienda sigue en su subdominio.' };
	}
};
