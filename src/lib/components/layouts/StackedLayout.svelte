<!--
@component
Layout de documento: barra de arriba pegada, contenido en el flujo de la
página y pie. La ventana hace el scroll. Para la tienda, el sitio comercial y
la consola de la plataforma.
-->
<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';

	// Componentes
	import SkipLink from './SkipLink.svelte';

	// Utilidades
	import { cn } from '$lib/utils';

	interface Props {
		/** La barra de arriba: marca y navegación. */
		header?: Snippet;
		/** Una franja sobre la barra, que se va con el scroll (un anuncio). */
		banner?: Snippet;
		children: Snippet;
		footer?: Snippet;
		/** La barra se queda pegada arriba al bajar. */
		stickyHeader?: boolean;
		class?: string;
	}

	let { header, banner, children, footer, stickyHeader = true, class: className }: Props = $props();
</script>

<div data-layout="stacked" class={cn('flex min-h-dvh flex-col', className)}>
	<SkipLink target="main-content" />

	{#if banner}
		<div data-slot="banner" data-scroll="scroll">
			{@render banner()}
		</div>
	{/if}

	{#if header}
		<header data-slot="header" data-scroll="fixed" class={cn(stickyHeader && 'sticky top-0 z-30')}>
			{@render header()}
		</header>
	{/if}

	<main
		id="main-content"
		tabindex="-1"
		data-slot="main"
		data-scroll="scroll"
		class="flex-1 outline-none"
	>
		{@render children()}
	</main>

	{#if footer}
		<footer data-slot="footer" data-scroll="scroll">
			{@render footer()}
		</footer>
	{/if}
</div>
