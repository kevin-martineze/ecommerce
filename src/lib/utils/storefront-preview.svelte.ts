// Tipos
import type { DraftContent, PreviewZone, StorefrontDraft } from '$lib/domain/preview';
import type { StorefrontTemplate } from '$lib/domain/templates';
import type { StoreTheme } from '$lib/domain/theme';

// Utilidades
import { storePage, themePreviewUrl } from '$lib/template-preview';

/** Lo que una pantalla del panel sabe de la tienda para pintar su vista previa. */
export interface PreviewStore {
	settings: { template: StorefrontTemplate; theme: StoreTheme };
	/** La dirección de la tienda (su subdominio): la vista previa va en iframe. */
	previewUrl: string;
}

/**
 * La base de los ViewModels con vista previa en vivo: la pantalla edita un
 * borrador (`content`) y la tienda lo pinta en un iframe en la página `path`,
 * resaltando la zona `focus`.
 *
 * Cada pantalla hereda de aquí, declara sus campos con `$state` y dice cómo
 * se arma su `content()`.
 */
export abstract class StorefrontPreview<C extends DraftContent> {
	/** Lo que se le manda al iframe en cada cambio. */
	readonly draft: StorefrontDraft;
	/** La página de la tienda que carga el iframe, con lo guardado. */
	readonly src: string;

	constructor(store: () => PreviewStore, path: string, focus: PreviewZone) {
		this.src = $derived(
			themePreviewUrl(
				storePage(path, store().previewUrl),
				store().settings.template,
				store().settings.theme
			)
		);
		this.draft = $derived({
			template: store().settings.template,
			theme: store().settings.theme,
			content: this.content(),
			focus
		});
	}

	/** El borrador del módulo, en la forma que la tienda sabe pintar. */
	abstract content(): C;
}
