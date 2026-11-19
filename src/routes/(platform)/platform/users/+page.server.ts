// Tipos
import type { PageServerLoad } from './$types';

// Servidor
import { listUsers } from '$lib/server/api/platform';
import { accountContext, orFail } from '$lib/server/context';

// Dominio
import { userFilterStatusSchema } from '$lib/schemas/platform';

export const load: PageServerLoad = async (event) => {
	const ctx = accountContext(event);
	const params = event.url.searchParams;
	const status = userFilterStatusSchema.safeParse(params.get('status'));

	const filters = {
		q: params.get('q')?.trim().slice(0, 120) || null,
		status: status.success ? status.data : null
	};

	return { users: orFail(await listUsers(ctx, filters)), filters };
};
