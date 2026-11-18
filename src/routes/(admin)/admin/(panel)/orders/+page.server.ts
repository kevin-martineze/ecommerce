// Tipos
import type { PageServerLoad } from './$types';

// Servidor
import { listOrders } from '$lib/server/api/panel-commerce';
import { orFail, panelContext } from '$lib/server/context';

// Dominio
import { isOrderStatus } from '$lib/domain/orders';

export const load: PageServerLoad = async (event) => {
	const statusParam = event.url.searchParams.get('status');
	const page = Number(event.url.searchParams.get('page') ?? '1');

	const filters = {
		status: isOrderStatus(statusParam) ? statusParam : null,
		q: event.url.searchParams.get('q'),
		page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
	};

	const result = orFail(await listOrders(panelContext(event), filters));

	return { ...result, filters };
};
