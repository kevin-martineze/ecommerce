<!--
@component
Un módulo del panel con vista previa en vivo: el formulario a la izquierda y
la tienda de verdad a la derecha, pegada mientras se recorre el formulario.
En celular, un botón abre la tienda en una hoja.

La página pone el formulario (con su `action` y su `use:enhance`) y el
borrador que sale de su ViewModel.
-->
<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';
	import type { StorefrontDraft } from '$lib/domain/preview';

	// Componentes
	import PageLayout from '$lib/components/layouts/PageLayout.svelte';
	import PageHeader from '$lib/components/molecules/PageHeader.svelte';
	import PreviewPanel from '$lib/components/organisms/PreviewPanel.svelte';
	import PreviewSheet from '$lib/components/organisms/PreviewSheet.svelte';

	interface Props {
		title: string;
		description?: string;
		back?: { href: string; label: string };
		actions?: Snippet;
		intro?: Snippet;
		/** La página de la tienda que carga el iframe. */
		src: string;
		/** Lo que se le manda a la tienda en cada cambio. */
		draft: StorefrontDraft;
		/** El título del iframe y de la hoja del celular: «Así se ve tu cupón». */
		previewTitle: string;
		/** La cabecera se queda arriba desde `md` (por defecto); `false` la apaga. */
		stickyHeader?: boolean;
		children: Snippet;
	}

	let {
		title,
		description,
		back,
		actions,
		intro,
		src,
		draft,
		previewTitle,
		stickyHeader,
		children
	}: Props = $props();
</script>

<PageLayout asideWidth="half" asideOnMobile={false} {stickyHeader}>
	{#snippet header()}
		<PageHeader {title} {description} {back} {actions} children={intro} />
	{/snippet}

	{#snippet aside()}
		<PreviewPanel {src} {draft} title={previewTitle} />
	{/snippet}

	{@render children()}
</PageLayout>

<PreviewSheet {src} {draft} title={previewTitle} />
