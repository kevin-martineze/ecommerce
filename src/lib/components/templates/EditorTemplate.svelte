<!--
@component
Un editor a pantalla completa: `CanvasLayout` con la barra armada (salir,
título, herramientas, acciones). La página pone las herramientas, el panel de
controles y el lienzo.
-->
<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';

	// Iconos
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import CanvasLayout from '$lib/components/layouts/CanvasLayout.svelte';

	interface Props {
		title: string;
		/** Una línea bajo el título: la tienda, si hay cambios sin guardar. */
		subtitle?: Snippet;
		/** A dónde lleva «Salir». */
		exitHref: string;
		/** Opciones del lienzo: página, pantalla. */
		tools?: Snippet;
		/** Guardar, descartar, ver publicado. */
		actions?: Snippet;
		/** Los controles que editan lo que se ve en el lienzo. */
		panel: Snippet;
		/** El lienzo. */
		children: Snippet;
	}

	let { title, subtitle, exitHref, tools, actions, panel, children }: Props = $props();
</script>

<CanvasLayout class="admin-shell" {panel}>
	{#snippet toolbar()}
		<div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 lg:flex-nowrap">
			<Button href={exitHref} variant="ghost" size="sm">
				<ArrowLeft />
				Salir
			</Button>

			<div class="min-w-0">
				<h1 class="truncate text-base">{title}</h1>
				{#if subtitle}
					<p class="text-muted-foreground truncate text-xs">{@render subtitle()}</p>
				{/if}
			</div>

			{#if tools}
				<div class="ml-auto flex items-center gap-1">{@render tools()}</div>
			{/if}

			{#if actions}
				<div class={tools ? 'flex items-center gap-2' : 'ml-auto flex items-center gap-2'}>
					{@render actions()}
				</div>
			{/if}
		</div>
	{/snippet}

	{@render children()}
</CanvasLayout>
