// Librerías
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

// Servidor
import { formValues, parseForm } from '$lib/server/form';

// Dominio
import { checkbox, optionalInt, optionalText } from '$lib/schemas/fields';

function post(entries: [string, string][]): { request: Request } {
	const body = new FormData();

	for (const [key, value] of entries) body.append(key, value);

	return { request: new Request('http://localhost/', { method: 'POST', body }) };
}

describe('formValues', () => {
	it('un campo es su valor y uno repetido una lista', () => {
		const data = new FormData();
		data.append('name', 'Ana');
		data.append('tag', 'a');
		data.append('tag', 'b');

		expect(formValues(data)).toEqual({ name: 'Ana', tag: ['a', 'b'] });
	});
});

describe('parseForm', () => {
	const schema = z.object({
		code: z.string().trim().min(3, 'El código es muy corto.'),
		active: checkbox,
		maxUses: optionalInt,
		note: optionalText
	});

	it('devuelve los datos ya convertidos', async () => {
		const form = await parseForm(
			post([
				['code', ' ABC '],
				['active', 'on'],
				['maxUses', '5'],
				['note', '']
			]),
			schema
		);

		expect(form.ok && form.data).toEqual({ code: 'ABC', active: true, maxUses: 5, note: null });
	});

	it('un checkbox sin marcar es false y un número vacío es null', async () => {
		const form = await parseForm(
			post([
				['code', 'ABC'],
				['maxUses', '']
			]),
			schema
		);

		expect(form.ok && form.data).toEqual({ code: 'ABC', active: false, maxUses: null, note: null });
	});

	it('falla con 400, el primer error y los errores por campo', async () => {
		const form = await parseForm(
			post([
				['code', 'A'],
				['maxUses', 'x']
			]),
			schema
		);

		expect(form.ok).toBe(false);
		if (form.ok) return;
		expect(form.failure.status).toBe(400);
		expect(form.failure.data.error).toBe('El código es muy corto.');
		expect(form.failure.data.fields).toEqual({
			code: 'El código es muy corto.',
			maxUses: 'Escribe un número.'
		});
	});
});
