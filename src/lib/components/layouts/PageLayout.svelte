<!--
@component
Layout de una página dentro de otro layout (el del panel, el de la
plataforma): cabecera, contenido y, si hace falta, una columna al lado.

La columna `aside` se queda pegada desde `lg` mientras el contenido avanza; en
celular va debajo, salvo que la página la oculte y la ofrezca de otra forma.
-->
<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';

	// Utilidades
	import { cn } from '$lib/utils';

	interface Props {
		/** La cabecera de la página: título, descripción, acciones. */
		header?: Snippet;
		children: Snippet;
		/** La columna lateral. */
		aside?: Snippet;
		/**
		 * El ancho de la columna: `sm` para notas y resúmenes, `half` para una
		 * vista previa que necesita casi la mitad de la pantalla.
		 */
		asideWidth?: 'sm' | 'half';
		/** En celular la columna no se pinta: la página la ofrece de otra forma. */
		asideOnMobile?: boolean;
		/** El ancho máximo de la página. */
		width?: 'default' | 'narrow' | 'full';
		class?: string;
	}

	let {
		header,
		children,
		aside,
		asideWidth = 'sm',
		asideOnMobile = true,
		width = 'default',
		class: className
	}: Props = $props();
</script>

<div
	data-layout="page"
	class={cn(
		'mx-auto w-full px-4 py-8 sm:px-6',
		width === 'default' && 'max-w-6xl',
		width === 'narrow' && 'max-w-3xl',
		className
	)}
>
	{#if header}
		<div data-slot="header" data-scroll="fixed" class="mb-6">
			{@render header()}
		</div>
	{/if}

	{#if aside}
		<div
			class={cn(
				'grid gap-6',
				asideWidth === 'sm' && 'lg:grid-cols-[minmax(0,1fr)_18rem]',
				asideWidth === 'half' && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]'
			)}
		>
			<div data-slot="content" data-scroll="scroll" class="min-w-0">
				{@render children()}
			</div>

			<aside
				data-slot="aside"
				data-scroll="fixed"
				class={cn(
					'lg:sticky lg:top-[calc(var(--layout-header-h,0px)+1.5rem)] lg:self-start',
					!asideOnMobile && 'hidden lg:block'
				)}
			>
				{@render aside()}
			</aside>
		</div>
	{:else}
		<div data-slot="content" data-scroll="scroll">
			{@render children()}
		</div>
	{/if}
</div>
