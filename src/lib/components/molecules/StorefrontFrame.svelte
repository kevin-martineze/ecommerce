<script lang="ts">
	// Utilidades
	import { cn } from '$lib/utils';

	/**
	 * La tienda de verdad, en miniatura.
	 *
	 * Un `iframe` con la vitrina real a 1280 px de ancho, escalado para caber
	 * donde se ponga: lo que se ve es exactamente lo que verá una clienta, con
	 * los productos y los textos de esta tienda, no una maqueta. El ancho lo
	 * mide Svelte (`bind:clientWidth`), así que no hace falta JavaScript propio
	 * para la escala.
	 *
	 * Es una muestra, no una página dentro de otra: no recibe clics ni foco, y
	 * para quien no ve la pantalla lo que importa lo dice el texto de al lado.
	 */
	interface Props {
		src: string;
		title: string;
		class?: string;
	}

	let { src, title, class: className }: Props = $props();

	/** El ancho al que se pinta la vitrina antes de encogerla. */
	const REAL_WIDTH = 1280;

	let width = $state(0);
	const scale = $derived(width > 0 ? width / REAL_WIDTH : 0);
</script>

<div
	bind:clientWidth={width}
	class={cn(
		'bg-muted border-border relative aspect-[4/3] w-full overflow-hidden rounded-lg border',
		className
	)}
>
	{#if scale > 0}
		<iframe
			{src}
			{title}
			loading="lazy"
			tabindex="-1"
			aria-hidden="true"
			class="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
			style="width: {REAL_WIDTH}px; height: {(REAL_WIDTH * 3) / 4}px; transform: scale({scale});"
		></iframe>
	{/if}
</div>
