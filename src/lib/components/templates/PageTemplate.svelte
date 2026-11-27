<!--
@component
Una página del panel o de la plataforma: `PageLayout` con la cabecera armada
(volver, título, descripción, acciones). La página pone el contenido y, si la
necesita, una columna al lado.
-->
<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';

	// Componentes
	import PageLayout from '$lib/components/layouts/PageLayout.svelte';
	import PageHeader from '$lib/components/molecules/PageHeader.svelte';

	interface Props {
		title: string;
		description?: string;
		eyebrow?: string;
		back?: { href: string; label: string };
		/** Algo pegado al título: el estado de una tienda, de un pedido. */
		badge?: Snippet;
		/** Botones y filtros a la derecha del título. */
		actions?: Snippet;
		/** Texto de ayuda largo, bajo la descripción. */
		intro?: Snippet;
		children: Snippet;
		aside?: Snippet;
		width?: 'default' | 'narrow' | 'full';
		/** La cabecera se queda arriba desde `md` (por defecto); `false` la apaga. */
		stickyHeader?: boolean;
	}

	let {
		title,
		description,
		eyebrow,
		back,
		badge,
		actions,
		intro,
		children,
		aside,
		width,
		stickyHeader
	}: Props = $props();
</script>

<PageLayout {aside} {width} {stickyHeader}>
	{#snippet header()}
		<PageHeader {title} {description} {eyebrow} {back} {badge} {actions} children={intro} />
	{/snippet}

	{@render children()}
</PageLayout>
