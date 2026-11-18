<!--
@component
Layout de las aplicaciones: barra lateral fija y contenido con su propio scroll.

Modo app: la ventana nunca hace scroll; solo `main`. La barra lateral se ve
desde `lg`; en celular la reemplaza `header`, fijo arriba. Al navegar, el
contenido vuelve arriba (la ventana no lo hace sola porque ya no es ella la
que hace scroll).

Slots: `sidebar` (fijo, scroll propio si es largo), `header` (fijo, solo
celular), `banner` (fijo, sobre el contenido) y `children` (main, scroll).
-->
<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';

	// App
	import { afterNavigate } from '$app/navigation';

	// Componentes
	import SkipLink from './SkipLink.svelte';

	// Utilidades
	import { cn } from '$lib/utils';
	import { provideLayoutScroll } from './layout-scroll';

	interface Props {
		sidebar: Snippet;
		/** La navegación del celular, en lugar de la barra lateral. */
		header?: Snippet;
		/** Avisos que van sobre el contenido y no se van con el scroll. */
		banner?: Snippet;
		children: Snippet;
		/**
		 * `inset`: el contenido va en un panel con borde y esquinas sobre el
		 * fondo de la barra lateral (el `SidebarInset` de shadcn).
		 */
		variant?: 'plain' | 'inset';
		class?: string;
	}

	let { sidebar, header, banner, children, variant = 'plain', class: className }: Props = $props();

	let main = $state<HTMLElement | null>(null);

	provideLayoutScroll(() => main);

	afterNavigate(({ type, to }) => {
		// Atrás y adelante los maneja el navegador; un ancla la maneja el enlace.
		if (type === 'popstate' || to?.url.hash) return;

		main?.scrollTo({ top: 0 });
	});
</script>

<div data-layout="app-shell" class={cn('flex h-dvh overflow-hidden', className)}>
	<SkipLink target="main-content" />

	<aside
		data-slot="sidebar"
		data-scroll="fixed"
		class="bg-sidebar text-sidebar-foreground hidden w-64 flex-none flex-col overflow-y-auto overscroll-contain lg:flex"
	>
		{@render sidebar()}
	</aside>

	<div
		class={cn(
			'bg-background flex min-w-0 flex-1 flex-col',
			variant === 'inset' && 'border-border lg:my-2 lg:mr-2 lg:rounded-xl lg:border'
		)}
	>
		{#if header}
			<header data-slot="header" data-scroll="fixed" class="border-border border-b lg:hidden">
				{@render header()}
			</header>
		{/if}

		{#if banner}
			<div data-slot="banner" data-scroll="fixed">
				{@render banner()}
			</div>
		{/if}

		<main
			bind:this={main}
			id="main-content"
			tabindex="-1"
			data-slot="main"
			data-scroll="scroll"
			class="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none [scrollbar-gutter:stable]"
		>
			{@render children()}
		</main>
	</div>
</div>
