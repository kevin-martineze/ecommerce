// Librerías
import { describe, expect, it } from 'vitest';

// Dominio
import { actionFeedback, actionFieldError } from '$lib/domain/action-feedback';

describe('actionFeedback', () => {
	it('un error string se muestra como error', () => {
		expect(actionFeedback({ error: 'El slug ya existe.' })).toEqual({
			kind: 'error',
			text: 'El slug ya existe.'
		});
	});

	it('un mensaje string se muestra como éxito', () => {
		expect(actionFeedback({ message: 'Categoría creada.' })).toEqual({
			kind: 'success',
			text: 'Categoría creada.'
		});
	});

	it('si vienen error y mensaje, gana el error', () => {
		expect(actionFeedback({ error: 'No se pudo.', message: 'Guardado.' })).toEqual({
			kind: 'error',
			text: 'No se pudo.'
		});
	});

	it('ok en true sin mensaje dice «Cambios guardados.»', () => {
		expect(actionFeedback({ ok: true })).toEqual({
			kind: 'success',
			text: 'Cambios guardados.'
		});
	});

	it('los textos vacíos o solo con espacios no cuentan', () => {
		expect(actionFeedback({ error: '   ', message: '' })).toBeNull();
		expect(actionFeedback({ error: '', ok: true })).toEqual({
			kind: 'success',
			text: 'Cambios guardados.'
		});
	});

	it('recorta el texto', () => {
		expect(actionFeedback({ message: '  Foto subida.  ' })).toEqual({
			kind: 'success',
			text: 'Foto subida.'
		});
	});

	it('valores que no son de una acción no avisan nada', () => {
		expect(actionFeedback(null)).toBeNull();
		expect(actionFeedback(undefined)).toBeNull();
		expect(actionFeedback('error')).toBeNull();
		expect(actionFeedback(42)).toBeNull();
		expect(actionFeedback({})).toBeNull();
		expect(actionFeedback({ ok: false })).toBeNull();
		expect(actionFeedback({ error: 500, message: 12 })).toBeNull();
	});
});

describe('actionFieldError', () => {
	it('lee el error de un campo', () => {
		expect(actionFieldError({ error: 'x', fields: { code: 'Muy corto.' } }, 'code')).toBe(
			'Muy corto.'
		);
	});

	it('null si el campo no tiene error o no hay campos', () => {
		expect(actionFieldError({ fields: { code: 'Muy corto.' } }, 'value')).toBeNull();
		expect(actionFieldError({ error: 'x' }, 'code')).toBeNull();
		expect(actionFieldError(null, 'code')).toBeNull();
	});
});
