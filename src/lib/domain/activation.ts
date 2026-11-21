/**
 * Embudo de activación: en qué paso va cada tienda. Las etapas son lineales y
 * acumulativas; una tienda está en la más alta que alcanzó.
 */

export const ACTIVATION_STAGES = [
	'created',
	'catalog',
	'first_order',
	'first_sale',
	'paying'
] as const;

export type ActivationStage = (typeof ACTIVATION_STAGES)[number];

export const ACTIVATION_STAGE_LABEL: Record<ActivationStage, string> = {
	created: 'Recién creada',
	catalog: 'Con catálogo',
	first_order: 'Primer pedido',
	first_sale: 'Primera venta',
	paying: 'Paga Globerce'
};

/** Lo que la consola sabe de una tienda en el embudo. Las fechas llegan en ISO. */
export interface StoreActivation {
	stage: ActivationStage;
	stage_reached_at: string;
	first_product_at: string | null;
	first_order_at: string | null;
	first_sale_at: string | null;
	first_payment_at: string | null;
	/** Última vez que alguien del equipo entró al panel. Null si nunca. */
	last_seen_at: string | null;
	active_products_with_photo: number;
	has_logo: boolean;
	wompi_connected: boolean;
	/** Número de WhatsApp de la tienda, tal como lo guardó. */
	contact_phone: string | null;
}

const MS_PER_DAY = 86_400_000;

const bogotaDay = new Intl.DateTimeFormat('en-CA', {
	timeZone: 'America/Bogota',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

/** Día calendario de Colombia (`YYYY-MM-DD`) de un instante. */
function bogotaDayOf(date: Date): string {
	return bogotaDay.format(date);
}

/**
 * Días enteros desde `iso` hasta `now`, contados por día calendario de Colombia:
 * una tienda que llegó a su etapa a las 23:50 de ayer lleva 1 día, no 0, aunque
 * hayan pasado menos de 24 horas. Nunca negativo.
 */
export function daysSince(iso: string, now: Date): number {
	const from = Date.parse(`${bogotaDayOf(new Date(iso))}T00:00:00Z`);
	const to = Date.parse(`${bogotaDayOf(now)}T00:00:00Z`);

	return Math.max(0, Math.round((to - from) / MS_PER_DAY));
}
