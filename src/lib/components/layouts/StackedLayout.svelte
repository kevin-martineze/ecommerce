<!--
@component
Layout de documento: franja de aviso, barra de arriba, contenido en el flujo
de la página y pie. La ventana hace el scroll. Para la tienda, el sitio
comercial y la consola de la plataforma.

Dónde va la barra lo decide el layout, nunca la barra: `sticky` se queda
arriba al bajar, `overlay` flota sobre el contenido (una portada a pantalla
completa) y `static` se va con el scroll.
-->
<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	// Componentes
	import SkipLink from './SkipLink.svelte';

	// Utilidades
	import { cn } from '$lib/utils';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
		/** Una franja sobre la barra, que se va con el scroll (un anuncio). */
		banner?: Snippet;
		/** La barra de arriba: marca y navegación. */
		header?: Snippet;
		headerPosition?: 'sticky' | 'overlay' | 'static';
		children: Snippet;
		footer?: Snippet;
		/**
		 * Envuelve el contenido y el pie, sin la barra: para un scroll suave que
		 * mueve el contenido y no debe arrastrar una barra fija.
		 */
		scroller?: Snippet<[Snippet]>;
		class?: string;
		style?: string;
	}

	let {
		banner,
		header,
		headerPosition = 'sticky',
		children,
		footer,
		scroller,
		class: className,
		style,
		...rest
	}: Props = $props();

	/** La altura de la barra: lo pegado de las páginas (`SplitLayout`) se pone debajo. */
	let headerHeight = $state(0);

	const offset = $derived(headerPosition === 'static' ? 0 : headerHeight);
</script>

{#snippet body()}
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
{/snippet}

<div
	data-layout="stacked"
	class={cn('flex min-h-dvh flex-col', className)}
	style={[style, `--layout-header-h: ${offset}px`].filter(Boolean).join('; ')}
	{...rest}
>
	<SkipLink target="main-content" />

	{#if banner}
		<div data-slot="banner" data-scroll="scroll">
			{@render banner()}
		</div>
	{/if}

	{#if header}
		<header
			bind:clientHeight={headerHeight}
			data-slot="header"
			data-scroll="fixed"
			class={cn(
				// La barra puede esconderse moviéndose hacia arriba: su caja no debe tapar clics.
				headerPosition === 'sticky' &&
					'pointer-events-none sticky top-0 z-40 *:pointer-events-auto',
				headerPosition === 'overlay' &&
					'pointer-events-none fixed inset-x-0 top-0 z-40 *:pointer-events-auto'
			)}
		>
			{@render header()}
		</header>
	{/if}

	{#if scroller}
		{@render scroller(body)}
	{:else}
		{@render body()}
	{/if}
</div>
