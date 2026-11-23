/**
 * Formato de precios en pesos colombianos.
 * El COP no usa decimales, así que todo se guarda y se muestra como entero.
 */

const formatter = new Intl.NumberFormat('es-CO', {
	style: 'currency',
	currency: 'COP',
	minimumFractionDigits: 0,
	maximumFractionDigits: 0
});

export function formatMoney(value: number): string {
	// Intl deja "COP 89.900" o "$ 89.900" según el runtime; normalizamos a "$89.900".
	return formatter
		.format(Math.round(value))
		.replace(/^COP\s?/, '$')
		.replace(/\s/g, '');
}

/** Versión corta para etiquetas de gráficas: "$49k", "$1,3 M". La completa va en el tooltip. */
export function formatCompactMoney(value: number): string {
	const rounded = Math.round(value);

	if (Math.abs(rounded) >= 1_000_000) {
		const millions = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(
			rounded / 1_000_000
		);

		return `$${millions} M`;
	}

	if (Math.abs(rounded) >= 1_000) {
		const thousands = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(
			rounded / 1_000
		);

		return `$${thousands}k`;
	}

	return formatMoney(rounded);
}

/** Versión sin símbolo, para inputs del panel de administración. */
export function formatAmount(value: number): string {
	return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Math.round(value));
}

/** Lee un precio escrito por la administradora ("89.900", "$89900", "89 900"). */
export function parseAmount(raw: string): number | null {
	const digits = raw.replace(/[^\d]/g, '');
	if (digits === '') return null;

	const value = Number(digits);
	return Number.isFinite(value) ? value : null;
}

/** Tope de dígitos al escribir: más allá ningún precio es real y `Number` pierde precisión. */
const MAX_AMOUNT_DIGITS = 12;

export interface TypedAmount {
	/** Lo que debe quedar escrito en el campo ("89.900"). */
	text: string;
	/** El valor numérico, o `null` si el campo quedó vacío. */
	value: number | null;
	/** Dónde dejar el cursor para que no salte al final al reformatear. */
	caret: number;
}

/**
 * Reformatea un precio mientras se escribe: "89900" → "89.900".
 *
 * El cursor se ubica contando dígitos, no caracteres: si estaba después del
 * tercer dígito, queda después del tercer dígito aunque se agreguen puntos.
 */
export function typeAmount(raw: string, caret: number): TypedAmount {
	const digitsBefore = raw.slice(0, caret).replace(/\D/g, '').length;
	const value = parseAmount(raw.replace(/\D/g, '').slice(0, MAX_AMOUNT_DIGITS));
	const text = value === null ? '' : formatAmount(value);

	// Los ceros a la izquierda desaparecen: el cursor no puede pasar del total de dígitos.
	const target = Math.min(digitsBefore, text.replace(/\D/g, '').length);
	let position = 0;
	let seen = 0;

	while (position < text.length && seen < target) {
		if (/\d/.test(text.charAt(position))) seen += 1;
		position += 1;
	}

	return { text, value, caret: position };
}

export function discountPercent(price: number, compareAt: number | null): number | null {
	if (compareAt === null || compareAt <= price) return null;
	return Math.round(((compareAt - price) / compareAt) * 100);
}
