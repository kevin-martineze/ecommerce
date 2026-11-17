// Tipos
import type { Actions, PageServerLoad } from './$types';

// Svelte
import { redirect } from '@sveltejs/kit';

// Servidor
import { listSupportTickets, openSupportTicket } from '$lib/server/api/panel-support';
import { failWith, orFail, panelContext } from '$lib/server/context';
import { parseForm } from '$lib/server/form';

// Dominio
import { supportTicketSchema } from '$lib/schemas/support';

export const load: PageServerLoad = async (event) => {
	return { support: orFail(await listSupportTickets(panelContext(event))) };
};

export const actions: Actions = {
	create: async (event) => {
		const ctx = panelContext(event);
		const form = await parseForm(event, supportTicketSchema);

		if (!form.ok) return form.failure;

		const result = await openSupportTicket(ctx, form.data);

		if (!result.ok) return failWith(result);

		redirect(303, `/admin/support/${result.data.ticket.id}`);
	}
};
