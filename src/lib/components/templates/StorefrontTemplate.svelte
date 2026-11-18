<!--
@component
La vitrina de una tienda: `StackedLayout` con el anuncio, la cabecera (la
normal o la de menú grande, según la plantilla) y el pie fijos. Cada página
de la tienda pone solo su contenido.

La plantilla viste toda la vitrina: los tokens de `app.css` se redefinen bajo
`data-storefront-template`, y los ajustes de la dueña (color, letras,
esquinas) los pisan con un `style` en el mismo elemento.
-->
<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';
	import type { Category } from '$lib/domain/catalog';
	import type { Collection, StoreSettings } from '$lib/domain/settings';

	// Componentes
	import StackedLayout from '$lib/components/layouts/StackedLayout.svelte';
	import AnnouncementBar from '$lib/components/molecules/AnnouncementBar.svelte';
	import MegaMenuHeader from '$lib/components/organisms/MegaMenuHeader.svelte';
	import SiteFooter from '$lib/components/organisms/SiteFooter.svelte';
	import SiteHeader from '$lib/components/organisms/SiteHeader.svelte';

	// Dominio
	import { templateOf } from '$lib/domain/templates';
	import { themeStyle } from '$lib/domain/theme';

	interface Props {
		settings: StoreSettings;
		categories: Category[];
		collections: Collection[];
		/** Dentro del editor de Diseño: las zonas se marcan para resaltarlas. */
		draftPreview?: boolean;
		children: Snippet;
	}

	let { settings, categories, collections, draftPreview = false, children }: Props = $props();

	// La cabecera `mega` es otro organismo: el menú de categorías ocupa el ancho.
	const megaHeader = $derived(templateOf(settings.template).header === 'mega');
</script>

<StackedLayout
	data-storefront-template={settings.template}
	style={themeStyle(settings.template, settings.theme) || undefined}
	class="bg-background text-foreground"
>
	{#snippet banner()}
		{#if settings.announcement}
			<AnnouncementBar text={settings.announcement} {draftPreview} />
		{/if}
	{/snippet}

	{#snippet header()}
		{#if megaHeader}
			<MegaMenuHeader {settings} {categories} {collections} {draftPreview} />
		{:else}
			<SiteHeader {settings} {categories} {collections} {draftPreview} />
		{/if}
	{/snippet}

	{@render children()}

	{#snippet footer()}
		<SiteFooter {settings} {categories} {draftPreview} />
	{/snippet}
</StackedLayout>
