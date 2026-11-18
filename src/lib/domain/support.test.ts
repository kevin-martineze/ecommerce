// Librerías
import { describe, expect, it } from 'vitest';

// Dominio
import { waitingSince } from '$lib/domain/support';

const NOW = new Date('2026-11-03T12:00:00.000Z');

function ago(minutes: number): string {
	return new Date(NOW.getTime() - minutes * 60_000).toISOString();
}

describe('esperaDesde', () => {
	it('habla en minutos mientras no pasa la hora', () => {
		expect(waitingSince(ago(0), NOW)).toBe('hace 0 min');
		expect(waitingSince(ago(45), NOW)).toBe('hace 45 min');
	});

	it('pasa a horas y luego a días', () => {
		expect(waitingSince(ago(120), NOW)).toBe('hace 2 h');
		expect(waitingSince(ago(60 * 23), NOW)).toBe('hace 23 h');
		expect(waitingSince(ago(60 * 24), NOW)).toBe('hace 1 día');
		expect(waitingSince(ago(60 * 24 * 3), NOW)).toBe('hace 3 días');
	});

	it('una fecha futura no da una espera negativa', () => {
		expect(waitingSince(new Date(NOW.getTime() + 5 * 60_000).toISOString(), NOW)).toBe(
			'hace 0 min'
		);
	});
});
