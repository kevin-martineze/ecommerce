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
		/** Botones y filtros a la derecha del título. */
		actions?: Snippet;
		/** Texto de ayuda largo, bajo la descripción. */
		intro?: Snippet;
		children: Snippet;
		aside?: Snippet;
		width?: 'default' | 'narrow' | 'full';
	}

	let { title, description, eyebrow, back, actions, intro, children, aside, width }: Props =
		$props();
</script>

<PageLayout {aside} {width}>
	{#snippet header()}
		<PageHeader {title} {description} {eyebrow} {back} {actions} children={intro} />
	{/snippet}

	{@render children()}
</PageLayout>
