// Tipos
import type { ActionResult, SubmitFunction } from '@sveltejs/kit';

export interface SubmitOptions {
	/** Vaciar el formulario cuando sale bien. Por omisión sí, como `use:enhance`. */
	reset?: boolean;
	/**
	 * Justo antes de enviar: agregar al `FormData` lo que no está en el HTML
	 * (el carrito y los favoritos viven en localStorage, regla 13).
	 */
	prepare?: (formData: FormData) => void;
	/** Lo que pasa después de un envío que salió bien (limpiar un borrador, cerrar un diálogo). */
	onSuccess?: () => void;
	/** Lo que pasa después de cualquier envío, salga bien o mal. */
	onSettled?: () => void;
}

/**
 * El estado de envío de un formulario con `use:enhance`.
 *
 * ```svelte
 * const form = new FormState();
 * <form use:enhance={form.submit({ onSuccess: reset })}>
 *   <Button type="submit" disabled={form.pending}>…</Button>
 * ```
 *
 * Reemplaza el `saving = true … await update() … saving = false` que cada
 * página escribía a mano (regla 29: el submit se deshabilita mientras envía).
 */
export class FormState {
	pending = $state(false);

	/** `pending` arranca en true cuando el formulario se envía solo al montar (la cotización del carrito). */
	constructor(options: { pending?: boolean } = {}) {
		this.pending = options.pending ?? false;
	}

	submit(options: SubmitOptions = {}): SubmitFunction {
		return ({ formData }) => {
			this.begin(options, formData);

			return ({ result, update }) => this.settle(options, result.type, update);
		};
	}

	/** El inicio del envío: completa el `FormData` y deshabilita el submit. */
	begin(options: SubmitOptions, formData: FormData) {
		options.prepare?.(formData);
		this.pending = true;
	}

	/** El final del envío: aplica el resultado y vuelve a habilitar el submit. */
	async settle(
		options: SubmitOptions,
		outcome: ActionResult['type'],
		update: (opts: { reset: boolean }) => Promise<void>
	) {
		try {
			await update({ reset: options.reset ?? true });
		} finally {
			this.pending = false;
		}

		if (outcome === 'success') options.onSuccess?.();
		options.onSettled?.();
	}
}
