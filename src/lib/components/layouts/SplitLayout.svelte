<!--
@component
Dos columnas dentro de una página, con una que se queda pegada mientras la
otra avanza (desde `lg`; en celular se apilan). Lo pegado queda bajo la barra
del layout padre, sin que nadie calcule su altura.

- `filters`: filtros a la izquierda (ocultos en celular) y el listado.
- `detail`: la galería y, pegada a la derecha, la información para comprar.
- `summary`: lo que se revisa y, pegado a la derecha, el resumen con el botón.
-->
<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	// Utilidades
	import { cn } from '$lib/utils';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
		variant: 'filters' | 'detail' | 'summary';
		/** La columna que se queda pegada. */
		side: Snippet;
		children: Snippet;
		class?: string;
	}

	let { variant, side, children, class: className, ...rest }: Props = $props();

	/** Lo pegado arranca bajo la barra del layout padre (`--layout-header-h`). */
	const STICKY = 'lg:sticky lg:top-[calc(var(--layout-header-h,0px)+1.5rem)] lg:self-start';
</script>

{#snippet sideSlot()}
	<div
		data-slot="side"
		data-scroll="fixed"
		class={cn(variant === 'filters' ? 'hidden w-56 flex-none lg:block' : STICKY)}
	>
		{#if variant === 'filters'}
			<div class={STICKY}>{@render side()}</div>
		{:else}
			{@render side()}
		{/if}
	</div>
{/snippet}

<div
	data-layout="split"
	class={cn(
		variant === 'filters' && 'flex gap-10',
		variant === 'detail' && 'grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16',
		variant === 'summary' && 'grid gap-12 lg:grid-cols-[1.3fr_0.7fr]',
		className
	)}
	{...rest}
>
	{#if variant === 'filters'}
		{@render sideSlot()}
	{/if}

	<div data-slot="content" data-scroll="scroll" class="min-w-0 flex-1">
		{@render children()}
	</div>

	{#if variant !== 'filters'}
		{@render sideSlot()}
	{/if}
</div>
