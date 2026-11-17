<!--
@component
Layout de los editores: una barra de herramientas fija, un panel lateral con
su propio scroll y el lienzo, que llena el resto.

Modo app desde `lg`: la ventana no hace scroll, solo el panel. En celular se
apila como documento y el lienzo toma casi toda la pantalla. Contrato de
GlobUI: `data-layout`, y cada slot con `data-slot` y `data-scroll`.
-->
<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';

	// Utilidades
	import { cn } from '$lib/utils';

	interface Props {
		/** La barra de arriba: salir, opciones del lienzo, guardar. */
		toolbar: Snippet;
		/** El panel lateral: los controles que editan lo que se ve en el lienzo. */
		panel: Snippet;
		/** El lienzo. */
		children: Snippet;
		class?: string;
	}

	let { toolbar, panel, children, class: className }: Props = $props();
</script>

<div
	data-layout="canvas"
	class={cn('bg-background text-foreground flex flex-col lg:h-dvh lg:overflow-hidden', className)}
>
	<div data-slot="toolbar" data-scroll="fixed" class="border-border border-b">
		{@render toolbar()}
	</div>

	<div class="grid min-h-0 flex-1 lg:grid-cols-[22rem_minmax(0,1fr)]">
		<aside
			data-slot="panel"
			data-scroll="scroll"
			class="border-border min-h-0 overflow-y-auto overscroll-contain border-b lg:border-r lg:border-b-0"
		>
			{@render panel()}
		</aside>

		<main
			data-slot="canvas"
			data-scroll="fixed"
			class="bg-muted/60 h-[75dvh] min-h-0 p-4 lg:h-auto lg:p-6"
		>
			{@render children()}
		</main>
	</div>
</div>
