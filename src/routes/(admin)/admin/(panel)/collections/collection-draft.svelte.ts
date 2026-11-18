// Tipos
import type { PreviewStore } from '$lib/utils/storefront-preview.svelte';
import type { DraftCollection } from '$lib/domain/preview';

// Estado
import { FormState } from '$lib/utils/form-state.svelte';
import { StorefrontPreview } from '$lib/utils/storefront-preview.svelte';

// Utilidades
import { slugify } from '$lib/utils/slug';

/** La colección que se está creando, vista en su página de la tienda mientras se escribe. */
export class CollectionDraft extends StorefrontPreview<DraftCollection> {
	name = $state('');
	slug = $state('');
	description = $state('');
	active = $state(true);
	image = $state<Blob | null>(null);

	/** Al crear, el borrador vuelve a vacío. */
	readonly createForm = new FormState();
	readonly create = this.createForm.submit({ onSuccess: () => this.reset() });

	constructor(store: () => PreviewStore) {
		super(store, '/preview/collection', 'collection-header');
	}

	content(): DraftCollection {
		return {
			kind: 'collection',
			name: this.name,
			slug: this.slug || slugify(this.name),
			description: this.description,
			active: this.active,
			image: this.image,
			// Una colección nueva todavía no tiene productos etiquetados.
			items: []
		};
	}

	reset() {
		this.name = '';
		this.slug = '';
		this.description = '';
		this.active = true;
		this.image = null;
	}
}
