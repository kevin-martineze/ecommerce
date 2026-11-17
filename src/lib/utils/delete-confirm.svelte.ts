import type { SubmitFunction } from '@sveltejs/kit';

/** Lo que el diálogo de confirmación muestra y el form que va a enviar. */
export interface DeleteTarget {
	/** Id del <form> que confirma: el mismo que `ConfirmDeleteDialog` recibe en `form`. */
	formId: string;
	/** La pregunta del diálogo, por ejemplo «¿Borrar Bogotá?». */
	title: string;
	description?: string;
	confirmLabel: string;
	pendingLabel: string;
}

export interface AskOptions {
	description?: string;
	confirmLabel?: string;
	pendingLabel?: string;
}

/**
 * El estado de un diálogo de confirmación de borrado o de quitar: qué se pidió,
 * si el diálogo está abierto y si el envío va en curso.
 *
 * Uso: `ask(formId, pregunta)` desde el botón, `enhance()` como `use:enhance`
 * de los forms que confirman, y `ConfirmDeleteDialog` con `bind:open`, `form`
 * y `pending` tomados de este objeto.
 */
export class DeleteConfirm {
	target = $state<DeleteTarget | null>(null);
	open = $state(false);
	pending = $state(false);

	ask(formId: string, title: string, options: AskOptions = {}) {
		this.target = {
			formId,
			title,
			description: options.description,
			confirmLabel: options.confirmLabel ?? 'Borrar',
			pendingLabel: options.pendingLabel ?? 'Borrando…'
		};
		this.open = true;
	}

	/**
	 * La `SubmitFunction` de los forms que confirman: marca el envío en curso,
	 * espera la respuesta, cierra el diálogo y, si salió bien, avisa con el
	 * objetivo que se confirmó.
	 */
	enhance(alBorrar?: (target: DeleteTarget) => void): SubmitFunction {
		return () => {
			const objetivo = this.target;

			this.pending = true;

			return async ({ result, update }) => {
				await update();
				this.pending = false;
				this.open = false;

				if (result.type === 'success' && objetivo) alBorrar?.(objetivo);
			};
		};
	}
}
