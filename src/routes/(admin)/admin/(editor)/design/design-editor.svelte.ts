// Tipos
import type { Section } from '$lib/domain/design';
import type { DesignChange, DesignSnapshot } from '$lib/domain/design-changes';
import type { StorefrontDraft } from '$lib/domain/preview';
import type { Collection, HomeHighlight, StoreSettings } from '$lib/domain/settings';

// Estado
import { FormState } from '$lib/utils/form-state.svelte';
import { HighlightsEditor } from './highlights-editor.svelte';

// Dominio
import { buildDraft, focusFor } from '$lib/domain/design';
import { describeDesignChanges } from '$lib/domain/design-changes';
import { accentProblem } from '$lib/domain/theme';

// Utilidades
import { storePage, themePreviewUrl } from '$lib/template-preview';

/** Lo que el editor necesita de la carga de la página. */
export interface DesignData {
	settings: StoreSettings;
	collections: Collection[];
	highlights: HomeHighlight[];
	previewUrl: string;
}

export type Device = 'desktop' | 'mobile';

/** Las páginas de la tienda que se pueden ver en la vista previa. */
export const PREVIEW_PAGES = [
	{ path: '/', label: 'Portada' },
	{ path: '/shop', label: 'Catálogo' }
];

/** Lo escalar de una tienda guardada, en la forma del borrador. */
export function snapshotOf(settings: StoreSettings): DesignSnapshot {
	return {
		template: settings.template,
		accent: settings.theme.accent ?? '',
		fonts: settings.theme.fonts ?? '',
		corners: settings.theme.corners ?? '',
		hero: settings.theme.hero ?? '',
		storeName: settings.store_name,
		announcement: settings.announcement ?? '',
		heroCollectionId: settings.hero_collection_id ?? '',
		heroTitle: settings.hero_title ?? '',
		heroSubtitle: settings.hero_subtitle ?? ''
	};
}

/** «1 cambio», «3 cambios». */
export function countChanges(count: number): string {
	return `${count} ${count === 1 ? 'cambio' : 'cambios'}`;
}

/**
 * El editor de Diseño: un borrador de todo lo escalar que se guarda con un solo
 * botón, la vista previa que lo pinta en vivo y los mensajes de abajo.
 *
 * La vista solo pinta y llama sus métodos (CLAUDE.md, regla 35). Los mensajes y
 * el logo no son parte del borrador: se guardan al instante con su acción.
 */
export class DesignEditor {
	/** El borrador: arranca con lo guardado y la dueña lo edita. */
	values: DesignSnapshot;

	device = $state<Device>('desktop');
	path = $state('/');
	/** Cuando la dueña entra a la lista de mensajes, la vista previa resalta esa zona. */
	inMessages = $state(false);
	saveDialogOpen = $state(false);
	discardDialogOpen = $state(false);

	readonly highlights: HighlightsEditor;

	/** El Guardar: envía todo el borrador y cierra el diálogo, salga bien o mal. */
	readonly saveForm = new FormState();
	readonly save = this.saveForm.submit({
		reset: false,
		prepare: (formData) => this.fill(formData),
		onSettled: () => (this.saveDialogOpen = false)
	});

	readonly saved: DesignSnapshot;
	/** Las diferencias con lo guardado, en el orden de las secciones. */
	readonly changes: DesignChange[];
	/** Hay cambios escalares sin guardar. Los mensajes y el logo no cuentan: se guardan solos. */
	readonly changed: boolean;
	readonly invalid: boolean;
	readonly collectionOptions: { value: string; label: string }[];
	readonly chosenCollection: Collection | null;
	/** Lo que la vista previa muestra: un solo borrador con todo, y la zona de la sección. */
	readonly draft: StorefrontDraft;
	/**
	 * La vista previa carga con lo guardado y el borrador le llega por mensaje;
	 * la URL solo cambia al cambiar de página, así no se recarga con cada cambio.
	 */
	readonly previewSrc: string;

	readonly #data: () => DesignData;

	/**
	 * @param data la carga de la página; se lee en cada cálculo, así lo guardado
	 *   se actualiza solo cuando la action termina.
	 * @param section la sección abierta, que sale de la URL.
	 */
	constructor(data: () => DesignData, section: () => Section) {
		this.#data = data;
		this.values = $state(snapshotOf(data().settings));
		this.highlights = new HighlightsEditor(() => data().highlights);

		this.saved = $derived(snapshotOf(data().settings));
		this.changes = $derived(describeDesignChanges(this.saved, this.values, data().collections));
		this.changed = $derived(this.changes.length > 0);
		this.invalid = $derived(accentProblem(this.values.template, this.values.accent) !== null);
		this.collectionOptions = $derived([
			{ value: '', label: 'Ninguna: usar mi propio título' },
			...data().collections.map((collection) => ({
				value: collection.id,
				label: collection.name
			}))
		]);
		this.chosenCollection = $derived(
			data().collections.find((collection) => collection.id === this.values.heroCollectionId) ??
				null
		);
		this.draft = $derived(
			buildDraft({
				...this.values,
				highlights: this.highlights.draft,
				focusZone: this.inMessages && section() === 'cover' ? 'highlights' : focusFor(section())
			})
		);
		this.previewSrc = $derived(
			themePreviewUrl(
				storePage(this.path, data().previewUrl),
				data().settings.template,
				data().settings.theme
			)
		);
	}

	get saving(): boolean {
		return this.saveForm.pending;
	}

	/** Vuelve todo lo escalar a lo guardado. */
	discard() {
		this.values = snapshotOf(this.#data().settings);
		this.discardDialogOpen = false;
	}

	/** Quita los ajustes de la plantilla: color, letras, esquinas y portada. */
	clearAdjustments() {
		this.values.accent = '';
		this.values.fonts = '';
		this.values.corners = '';
		this.values.hero = '';
	}

	/**
	 * El Guardar envía todo lo escalar desde el borrador, no desde los campos:
	 * así una sección cerrada no pierde lo que la dueña escribió en ella.
	 */
	fill(formData: FormData) {
		for (const [key, value] of Object.entries(this.values)) formData.set(key, value);
	}

	/**
	 * La pregunta antes de salir con cambios sin guardar, o null si se puede
	 * salir sin preguntar. Cambiar de sección no es salir.
	 */
	leaveWarning(): string | null {
		if (!this.changed || this.saving) return null;

		return `Tienes ${countChanges(this.changes.length)} sin guardar. ¿Salir sin guardarlos?`;
	}
}
