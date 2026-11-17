// Tipos
import type { SubmitFunction } from '@sveltejs/kit';

export interface SubmitOptions {
	/** Vaciar el formulario cuando sale bien. Por omisión sí, como `use:enhance`. */
	reset?: boolean;
	/** Lo que pasa después de un envío que salió bien (limpiar un borrador, cerrar un diálogo). */
	onSuccess?: () => void;
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

	submit(options: SubmitOptions = {}): SubmitFunction {
		return () => {
			this.pending = true;

			return async ({ result, update }) => {
				try {
					await update({ reset: options.reset ?? true });
				} finally {
					this.pending = false;
				}

				if (result.type === 'success') options.onSuccess?.();
			};
		};
	}
}
