// Tipos
import type { DraftHighlight } from '$lib/domain/preview';
import type { HomeHighlight } from '$lib/domain/settings';

// Estado
import { FormState } from '$lib/utils/form-state.svelte';

/** Lo que la dueña cambió de un bloque guardado y aún no ha enviado. */
export interface HighlightEdit {
	eyebrow?: string;
	title?: string;
	body?: string;
	sortOrder?: number;
	active?: boolean;
}

/**
 * Los mensajes de abajo de la portada: cada bloque guardado con lo que se va
 * escribiendo encima, más el bloque nuevo que se está armando. Todo se ve en
 * la vista previa antes de guardarlo.
 */
export class HighlightsEditor {
	edits = $state<Record<string, HighlightEdit>>({});

	newEyebrow = $state('');
	newTitle = $state('');
	newBody = $state('');
	newOrder = $state(1);
	newActive = $state(true);

	/** El envío del bloque nuevo: al salir bien, el borrador queda limpio. */
	readonly createForm = new FormState();
	readonly create = this.createForm.submit({ onSuccess: () => this.resetNew() });

	/** Los bloques guardados, con las ediciones encima. */
	readonly rows: DraftHighlight[];
	/** Hay algo escrito en el bloque nuevo. */
	readonly hasNew: boolean;
	/** Lo que la vista previa pinta: los guardados y, si hay algo escrito, el nuevo. */
	readonly draft: DraftHighlight[];

	readonly #saved: () => HomeHighlight[];

	constructor(saved: () => HomeHighlight[]) {
		this.#saved = saved;
		this.newOrder = this.nextOrder();

		this.rows = $derived(
			saved().map((highlight) => {
				const edit = this.edits[highlight.id];

				return {
					id: highlight.id,
					eyebrow: edit?.eyebrow ?? highlight.eyebrow,
					title: edit?.title ?? highlight.title,
					body: edit?.body ?? highlight.body,
					sortOrder: edit?.sortOrder ?? highlight.sort_order,
					active: edit?.active ?? highlight.active
				};
			})
		);
		this.hasNew = $derived(
			this.newEyebrow.trim() !== '' || this.newTitle.trim() !== '' || this.newBody.trim() !== ''
		);
		this.draft = $derived([
			...this.rows,
			...(this.hasNew
				? [
						{
							id: 'new',
							eyebrow: this.newEyebrow,
							title: this.newTitle,
							body: this.newBody,
							sortOrder: this.newOrder,
							active: this.newActive
						}
					]
				: [])
		]);
	}

	edit(id: string, patch: HighlightEdit) {
		this.edits[id] = { ...this.edits[id], ...patch };
	}

	/** El orden que le toca a un bloque nuevo: después del último. */
	nextOrder(): number {
		return this.#saved().reduce((max, highlight) => Math.max(max, highlight.sort_order), 0) + 1;
	}

	resetNew() {
		this.newEyebrow = '';
		this.newTitle = '';
		this.newBody = '';
		this.newOrder = this.nextOrder();
		this.newActive = true;
	}
}
