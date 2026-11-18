// Librerías
import { describe, expect, it, vi } from 'vitest';

// Estado
import { FormState } from '$lib/utils/form-state.svelte';

describe('FormState', () => {
	it('marca pending mientras envía y lo suelta al terminar', async () => {
		const state = new FormState();

		state.begin({}, new FormData());
		expect(state.pending).toBe(true);

		await state.settle({}, 'success', async () => {});
		expect(state.pending).toBe(false);
	});

	it('suelta pending aunque update falle', async () => {
		const state = new FormState();

		state.begin({}, new FormData());
		await expect(
			state.settle({}, 'error', async () => {
				throw new Error('red');
			})
		).rejects.toThrow('red');
		expect(state.pending).toBe(false);
	});

	it('arranca en pending si se le pide', () => {
		expect(new FormState({ pending: true }).pending).toBe(true);
	});

	it('llama onSuccess solo si salió bien y onSettled siempre', async () => {
		const onSuccess = vi.fn();
		const onSettled = vi.fn();
		const state = new FormState();

		await state.settle({ onSuccess, onSettled }, 'failure', async () => {});
		expect(onSuccess).not.toHaveBeenCalled();
		expect(onSettled).toHaveBeenCalledTimes(1);

		await state.settle({ onSuccess, onSettled }, 'success', async () => {});
		expect(onSuccess).toHaveBeenCalledTimes(1);
		expect(onSettled).toHaveBeenCalledTimes(2);
	});

	it('deja agregar datos al FormData y respeta reset', async () => {
		const state = new FormState();
		const formData = new FormData();
		const update = vi.fn(async () => {});
		const options = { reset: false, prepare: (data: FormData) => data.set('cart', '[]') };

		state.begin(options, formData);
		await state.settle(options, 'success', update);

		expect(formData.get('cart')).toBe('[]');
		expect(update).toHaveBeenCalledWith({ reset: false });
	});
});
