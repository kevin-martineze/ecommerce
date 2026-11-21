// Librerías
import { describe, expect, it } from 'vitest';

// Dominio
import { ACTIVATION_STAGES, ACTIVATION_STAGE_LABEL, daysSince } from '$lib/domain/activation';

describe('daysSince', () => {
	it('el mismo día calendario de Colombia son cero días', () => {
		// 10:00 y 20:00 de Bogotá (UTC-5), el mismo 20 de noviembre.
		expect(daysSince('2026-11-20T15:00:00Z', new Date('2026-11-21T01:00:00Z'))).toBe(0);
	});

	it('cuenta días calendario, no horas: 23:50 de ayer ya son un día', () => {
		// 23:50 del 20 en Bogotá contra las 00:10 del 21 en Bogotá.
		expect(daysSince('2026-11-21T04:50:00Z', new Date('2026-11-21T05:10:00Z'))).toBe(1);
	});

	it('cuenta varios días enteros', () => {
		expect(daysSince('2026-11-01T15:00:00Z', new Date('2026-11-21T15:00:00Z'))).toBe(20);
	});

	it('una fecha futura (reloj desfasado) no da días negativos', () => {
		expect(daysSince('2026-11-22T15:00:00Z', new Date('2026-11-21T15:00:00Z'))).toBe(0);
	});

	it('usa Colombia aunque el instante cruce la medianoche UTC', () => {
		// Las 21:00 del 20 en Bogotá son las 02:00 UTC del 21: el día de Colombia sigue siendo el 20.
		expect(daysSince('2026-11-20T10:00:00Z', new Date('2026-11-21T02:00:00Z'))).toBe(0);
	});
});

describe('ACTIVATION_STAGES', () => {
	it('va de la tienda recién creada a la que paga, en ese orden', () => {
		expect(ACTIVATION_STAGES).toEqual([
			'created',
			'catalog',
			'first_order',
			'first_sale',
			'paying'
		]);
	});

	it('tiene una etiqueta en español para cada etapa', () => {
		for (const stage of ACTIVATION_STAGES) {
			expect(ACTIVATION_STAGE_LABEL[stage]).toBeTruthy();
		}

		expect(ACTIVATION_STAGE_LABEL.paying).toBe('Paga Globerce');
	});
});
