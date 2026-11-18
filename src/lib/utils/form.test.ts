// Librerías
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

// Utilidades
import { fieldErrors } from '$lib/utils/form';

const schema = z.object({
	name: z.string().min(2, 'Escribe el nombre.').max(4, 'Muy largo.'),
	emailAddress: z.string().email('Correo inválido.')
});

function errorsOf(value: unknown) {
	const result = schema.safeParse(value);

	return result.success ? {} : fieldErrors(result.error);
}

describe('fieldErrors', () => {
	it('junta un mensaje por campo', () => {
		expect(errorsOf({ name: '', emailAddress: 'no-es-correo' })).toEqual({
			name: 'Escribe el nombre.',
			emailAddress: 'Correo inválido.'
		});
	});

	it('se queda con el primero de cada campo', () => {
		expect(errorsOf({ name: 12, emailAddress: 'ana@tienda.com' }).name).toBeDefined();
		expect(Object.keys(errorsOf({ name: '', emailAddress: '' }))).toEqual(['name', 'emailAddress']);
	});

	it('sin errores, no hay nada que pintar', () => {
		expect(errorsOf({ name: 'Ana', emailAddress: 'ana@tienda.com' })).toEqual({});
	});
});
