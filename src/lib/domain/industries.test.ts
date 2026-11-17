// Librerías
import { describe, expect, it } from 'vitest';

// Dominio
import { INDUSTRIES } from '$lib/domain/industries';

describe('RUBROS', () => {
	it('ninguno pasa de tres ejes: es el techo que acepta la API', () => {
		for (const industry of INDUSTRIES) {
			expect(industry.options.length).toBeLessThanOrEqual(3);
		}
	});

	it('ningún eje queda sin valores, que no dividiría nada', () => {
		for (const industry of INDUSTRIES) {
			for (const option of industry.options) {
				expect(option.values.length).toBeGreaterThan(0);
			}
		}
	});

	it('los tonos van en el formato que valida la base', () => {
		const tones = INDUSTRIES.flatMap((industry) =>
			industry.options.flatMap((option) => option.values.flatMap((value) => value.hex ?? []))
		);

		expect(tones.length).toBeGreaterThan(0);

		for (const tone of tones) {
			expect(tone).toMatch(/^#[0-9a-fA-F]{6}$/);
		}
	});

	it('hay una salida para quien no se divide en nada', () => {
		const withoutAxes = INDUSTRIES.filter((industry) => industry.options.length === 0);

		expect(withoutAxes).toHaveLength(1);
	});

	it('no repite nombres de eje dentro de un rubro', () => {
		for (const industry of INDUSTRIES) {
			const names = industry.options.map((option) => option.name);

			expect(new Set(names).size).toBe(names.length);
		}
	});
});
