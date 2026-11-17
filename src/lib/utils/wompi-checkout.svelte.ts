// Tipos
import type { ActionResult } from '@sveltejs/kit';
import type { WompiTransactionResult } from '$lib/utils/wompi-widget';

// Utilidades
import { openWompiWidget, widgetPayment } from '$lib/utils/wompi-widget';

/**
 * El flujo de cobro con el widget de Wompi, compartido por el pedido y el plan.
 *
 * Abre el widget con lo que devuelve la action; si la action no trae widget,
 * deja que SvelteKit siga su curso. Después de abrirlo, espera el evento de la
 * pasarela releyendo la página, y se rinde a los 60 s.
 *
 * Debe llamarse en el nivel superior de un componente: usa `$effect`.
 */

/** Cada cuánto se vuelve a leer la página mientras Wompi confirma. */
const INTERVAL_MS = 3_000;
/** Pasado este tiempo se deja de preguntar: el pago puede seguir en proceso. */
const MAX_TIME_MS = 60_000;

export interface WompiChargeOptions {
	/** Si el cobro ya se refleja en los datos de la página. */
	paid: () => boolean;
	/** Vuelve a leer los datos del `load`. */
	reload: () => Promise<void>;
}

export interface WompiCharge {
	/** Desde que se pide el enlace hasta que el widget está abierto o se redirige. */
	readonly opening: boolean;
	/** Wompi aprobó o dejó pendiente el pago; se espera el evento que lo confirma. */
	readonly confirming: boolean;
	/** Pasaron los 60 s sin confirmación: el pago puede seguir en proceso. */
	readonly isExpired: boolean;
	/** Wompi no aprobó el pago. El botón vuelve a estar disponible. */
	readonly rejected: boolean;
	/** Se llama antes de enviar el formulario de cobro. */
	start(): void;
	/**
	 * Con el resultado de la action: abre el widget si lo hay. Si no, llama a
	 * `update` para que SvelteKit siga como siempre.
	 */
	process(result: ActionResult, update: () => Promise<void>): Promise<void>;
}

export function wompiCharge(options: WompiChargeOptions): WompiCharge {
	let opening = $state(false);
	let confirming = $state(false);
	let isExpired = $state(false);
	let rejected = $state(false);

	// Mientras Wompi confirma, se vuelve a leer la página hasta que llegue el evento.
	$effect(() => {
		if (!confirming) return;

		const startAt = Date.now();
		const timer = setInterval(() => {
			if (options.paid()) {
				confirming = false;
				clearInterval(timer);

				return;
			}

			if (Date.now() - startAt >= MAX_TIME_MS) {
				confirming = false;
				isExpired = true;
				clearInterval(timer);

				return;
			}

			void options.reload();
		}, INTERVAL_MS);

		return () => clearInterval(timer);
	});

	/** Según la transacción que devuelve Wompi, espera la confirmación o avisa del rechazo. */
	function paymentOutcome(transaction: WompiTransactionResult | null) {
		if (!transaction) return;

		if (transaction.status === 'APPROVED' || transaction.status === 'PENDING') {
			isExpired = false;
			confirming = true;

			return;
		}

		// DECLINED, ERROR, VOIDED y cualquier otro estado que no sea de éxito.
		rejected = true;
	}

	return {
		get opening() {
			return opening;
		},
		get confirming() {
			return confirming;
		},
		get isExpired() {
			return isExpired;
		},
		get rejected() {
			return rejected;
		},

		start() {
			opening = true;
			rejected = false;
			isExpired = false;
		},

		async process(result, update) {
			const payment = widgetPayment(result);

			if (!payment) {
				await update();
				opening = false;

				return;
			}

			// Apenas el widget está abierto se reactiva el botón: el widget tapa la
			// página, y si la clienta lo cierra sin pagar, el botón ya está listo.
			try {
				await openWompiWidget(payment.widget, paymentOutcome);
			} catch {
				// Si el script de Wompi no carga, la URL de respaldo lleva a la pasarela.
				window.location.href = payment.url;

				return;
			}

			opening = false;
		}
	};
}
