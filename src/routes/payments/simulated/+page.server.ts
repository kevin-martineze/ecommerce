// Tipos
import type { Actions, PageServerLoad } from './$types';

// Svelte
import { error, redirect } from '@sveltejs/kit';

// Servidor
import { approveSimulatedPayment } from '$lib/server/api/payments';
import { clientAddress } from '$lib/server/context';

/**
 * La pasarela de mentira.
 *
 * Es la página a la que lleva `PAYMENTS_DRIVER=simulated`: hace de Wompi para
 * poder recorrer el flujo entero —crear el cobro, aprobarlo, confirmarlo con
 * un evento— sin abrir una cuenta de comercio y sin cobrarle a nadie.
 *
 * Aprobar desde aquí es, literalmente, regalar un mes. Por eso la API solo
 * atiende ese evento con la pasarela simulada encendida, que nunca es la de
 * por defecto.
 */
export const load: PageServerLoad = ({ url }) => {
	const reference = url.searchParams.get('reference');
	const amount = Number(url.searchParams.get('amount') ?? '0');

	if (!reference || !Number.isFinite(amount) || amount <= 0) {
		error(400, 'Este cobro no es válido.');
	}

	return {
		reference,
		amount,
		concept: url.searchParams.get('concept') ?? 'Pago',
		// A dónde se vuelve, pase lo que pase.
		returnTo: url.searchParams.get('returnTo') ?? '/admin/plan'
	};
};

export const actions: Actions = {
	approve: async (event) => {
		const formData = await event.request.formData();
		const reference = String(formData.get('referencia') ?? '');
		const amount = Number(formData.get('monto') ?? '0');
		const returnTo = String(formData.get('volver') ?? '/admin/plan');

		if (!reference || !Number.isFinite(amount)) error(400, 'Este cobro no es válido.');

		await approveSimulatedPayment(reference, amount, clientAddress(event));

		redirect(303, returnTo);
	}
};
