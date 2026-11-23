// Librerías
import { describe, expect, it } from 'vitest';

// Utilidades
import {
	discountPercent,
	formatAmount,
	formatCompactMoney,
	formatMoney,
	parseAmount,
	typeAmount
} from '$lib/utils/money';

describe('formatMoney', () => {
	it('formatea pesos colombianos sin decimales', () => {
		expect(formatMoney(89900)).toBe('$89.900');
		expect(formatMoney(1250000)).toBe('$1.250.000');
	});

	it('redondea valores con decimales', () => {
		expect(formatMoney(89900.6)).toBe('$89.901');
	});

	it('maneja el cero', () => {
		expect(formatMoney(0)).toBe('$0');
	});
});

describe('formatCompactMoney', () => {
	it('acorta miles y millones para la etiqueta de la barra', () => {
		expect(formatCompactMoney(0)).toBe('$0');
		expect(formatCompactMoney(49000)).toBe('$49k');
		expect(formatCompactMoney(1250000)).toBe('$1,3 M');
	});

	it('deja completo lo que no llega a mil', () => {
		expect(formatCompactMoney(850)).toBe('$850');
	});
});

describe('parseAmount', () => {
	it('lee precios escritos con puntos o símbolos', () => {
		expect(parseAmount('89.900')).toBe(89900);
		expect(parseAmount('$ 89 900')).toBe(89900);
		expect(parseAmount('229000')).toBe(229000);
	});

	it('devuelve null cuando no hay dígitos', () => {
		expect(parseAmount('')).toBeNull();
		expect(parseAmount('abc')).toBeNull();
	});
});

describe('formatAmount', () => {
	it('formatea sin símbolo para inputs del panel', () => {
		expect(formatAmount(89900)).toBe('89.900');
	});
});

describe('typeAmount', () => {
	it('pone los puntos de miles mientras se escribe', () => {
		expect(typeAmount('23000', 5)).toEqual({ text: '23.000', value: 23000, caret: 6 });
		expect(typeAmount('1250000', 7)).toEqual({ text: '1.250.000', value: 1250000, caret: 9 });
	});

	it('deja el cursor junto al mismo dígito al editar en medio', () => {
		// "23.000" con un 5 escrito después del 2: "253.000" → "253.000", cursor tras el 5.
		expect(typeAmount('253.000', 2)).toEqual({ text: '253.000', value: 253000, caret: 2 });
		// Borrar el 3 de "23.000" deja "2.000" → "2.000", cursor tras el 2.
		expect(typeAmount('2.000', 1)).toEqual({ text: '2.000', value: 2000, caret: 1 });
	});

	it('ignora letras y símbolos', () => {
		expect(typeAmount('$89a900', 7)).toEqual({ text: '89.900', value: 89900, caret: 6 });
	});

	it('quita los ceros a la izquierda sin perder el cursor', () => {
		expect(typeAmount('05', 2)).toEqual({ text: '5', value: 5, caret: 1 });
	});

	it('deja el campo vacío cuando no hay dígitos', () => {
		expect(typeAmount('', 0)).toEqual({ text: '', value: null, caret: 0 });
	});

	it('no deja escribir más de 12 dígitos', () => {
		expect(typeAmount('1234567890123', 13).value).toBe(123456789012);
	});
});

describe('discountPercent', () => {
	it('calcula el porcentaje de rebaja', () => {
		expect(discountPercent(179000, 199000)).toBe(10);
	});

	it('ignora precios tachados que no son rebaja', () => {
		expect(discountPercent(199000, 199000)).toBeNull();
		expect(discountPercent(199000, 150000)).toBeNull();
		expect(discountPercent(199000, null)).toBeNull();
	});
});
