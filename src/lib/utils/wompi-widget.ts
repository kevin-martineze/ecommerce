// Tipos
import type { ActionResult } from '@sveltejs/kit';
import type { WompiWidget } from '$lib/domain/wompi';

/**
 * El widget embebido de Wompi, solo para el navegador.
 *
 * Abre el pago dentro de la tienda en vez de mandar a la clienta a la página
 * de Wompi. Los datos y la firma llegan ya armados desde la API: aquí solo se
 * reenvían al widget, nunca se firma nada.
 */

const WIDGET_SRC = 'https://checkout.wompi.co/widget.js';

export interface WompiTransactionResult {
	id: string;
	status: string;
}

/** Lo que devuelve una action que cobra: el widget y la URL de respaldo. */
export interface WidgetPayment {
	widget: WompiWidget;
	url: string;
}

/** La carga se comparte: sin esto, dos clics meten dos `<script>` de Wompi. */
let loading: Promise<void> | null = null;

/** Mete el script de Wompi una sola vez. Si falla, se puede volver a intentar. */
export function loadWompiWidget(): Promise<void> {
	if (window.WidgetCheckout) return Promise.resolve();

	if (!loading) {
		loading = new Promise<void>((resolve, reject) => {
			const script = document.createElement('script');

			script.src = WIDGET_SRC;
			script.async = true;
			script.onload = () => resolve();
			script.onerror = () => {
				script.remove();
				loading = null;
				reject(new Error('No se pudo cargar el pago de Wompi.'));
			};

			document.head.appendChild(script);
		});
	}

	return loading;
}

/**
 * Abre el widget. La promesa resuelve cuando el widget ya está abierto, no
 * cuando termina el pago: el resultado llega después, por `onResult`.
 *
 * `onResult` recibe la transacción, o `null` si Wompi no trae ninguna.
 */
export async function openWompiWidget(
	widget: WompiWidget,
	onResult: (transactionData: WompiTransactionResult | null) => void
): Promise<void> {
	await loadWompiWidget();

	const Checkout = window.WidgetCheckout;

	if (!Checkout) throw new Error('El pago de Wompi no está disponible.');

	const checkout = new Checkout({
		currency: widget.currency,
		amountInCents: widget.amount_in_cents,
		reference: widget.reference,
		publicKey: widget.public_key,
		signature: { integrity: widget.integrity_signature },
		redirectUrl: widget.redirect_url,
		...(widget.customer_email ? { customerData: { email: widget.customer_email } } : {})
	});

	checkout.open((result) => onResult(result.transaction ?? null));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/** Lee el widget que devuelve la action, campo a campo, sin confiar en la forma. */
export function isWidget(value: unknown): value is WompiWidget {
	if (!isRecord(value)) return false;

	return (
		typeof value.public_key === 'string' &&
		value.currency === 'COP' &&
		typeof value.amount_in_cents === 'number' &&
		typeof value.reference === 'string' &&
		typeof value.integrity_signature === 'string' &&
		typeof value.redirect_url === 'string' &&
		(value.customer_email === null || typeof value.customer_email === 'string')
	);
}

/**
 * Solo hay pago con widget si la action trajo el widget y la URL de respaldo.
 * Cualquier otra cosa (error, redirección, API vieja) devuelve null.
 */
export function widgetPayment(result: ActionResult): WidgetPayment | null {
	if (result.type !== 'success') return null;

	const details: unknown = result.data;

	if (!isRecord(details) || typeof details.url !== 'string' || !isWidget(details.widget)) {
		return null;
	}

	return { widget: details.widget, url: details.url };
}
