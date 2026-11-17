<!--
@component
La cabecera de una página del panel: volver, título, descripción y acciones.
Un solo `h1` por página, siempre aquí.
-->
<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';

	// Iconos
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	// Utilidades
	import { cn } from '$lib/utils';

	interface Props {
		title: string;
		/** Una línea corta debajo del título. Para más texto, `children`. */
		description?: string;
		/** Una palabra encima del título: «Primer paso». */
		eyebrow?: string;
		/** El enlace para volver al listado. */
		back?: { href: string; label: string };
		/** Botones y filtros a la derecha del título. */
		actions?: Snippet;
		/** Texto de ayuda largo, debajo de la descripción. */
		children?: Snippet;
		class?: string;
	}

	let { title, description, eyebrow, back, actions, children, class: className }: Props = $props();
</script>

<header class={cn('flex flex-wrap items-start justify-between gap-3', className)}>
	<div class="min-w-0 space-y-1">
		{#if back}
			<a
				href={back.href}
				class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
			>
				<ArrowLeft class="size-3" />
				{back.label}
			</a>
		{/if}
		{#if eyebrow}
			<p class="eyebrow">{eyebrow}</p>
		{/if}
		<h1 class="text-3xl">{title}</h1>
		{#if description}
			<p class="text-muted-foreground max-w-2xl text-sm">{description}</p>
		{/if}
		{#if children}
			<div class="text-muted-foreground max-w-2xl space-y-1 text-sm">
				{@render children()}
			</div>
		{/if}
	</div>

	{#if actions}
		<div class="flex flex-wrap items-center gap-2">
			{@render actions()}
		</div>
	{/if}
</header>
