<!--
@component
Layout de una página dentro de otro layout (el del panel, el de la
plataforma): cabecera, contenido y, si hace falta, una columna al lado.

Desde `md` la cabecera se queda arriba mientras el contenido avanza. Sigue
siendo la misma región de scroll del layout padre: no hay una segunda. Lo que
pasa por debajo queda pegado bajo la cabecera, no detrás. Al bajar aparece una
línea inferior; en reposo no hay línea. En celular la cabecera se va con el
scroll. `stickyHeader={false}` la deja en el flujo normal.

La columna `aside` se queda pegada desde `lg` mientras el contenido avanza; en
celular va debajo, salvo que la página la oculte y la ofrezca de otra forma.
-->
<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';

	// Utilidades
	import { cn } from '$lib/utils';
	import { useLayoutScroll } from './layout-scroll';

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
		/** La cabecera se queda arriba desde `md`. Una página que no la necesite la apaga. */
		stickyHeader?: boolean;
		class?: string;
	}

	let {
		header,
		children,
		aside,
		asideWidth = 'sm',
		asideOnMobile = true,
		width = 'default',
		stickyHeader = true,
		class: className
	}: Props = $props();

	// La región de scroll del layout padre: la cabecera se pega dentro de ella.
	const scrollRegion = useLayoutScroll();

	let headerHeight = $state(0);
	let stuck = $state(false);

	// La línea de la cabecera aparece solo cuando el contenido ya subió por debajo.
	$effect(() => {
		if (!header || !stickyHeader) return;

		const region = scrollRegion();
		if (!region) return;

		const onScroll = () => {
			stuck = region.scrollTop > 0;
		};

		onScroll();
		region.addEventListener('scroll', onScroll, { passive: true });
		return () => region.removeEventListener('scroll', onScroll);
	});
</script>

<div
	data-layout="page"
	style={header && stickyHeader ? `--layout-header-h: ${headerHeight}px` : undefined}
	class={cn(
		'mx-auto w-full px-4 pb-8 sm:px-6',
		!header && 'pt-8',
		width === 'default' && 'max-w-6xl',
		width === 'narrow' && 'max-w-3xl',
		className
	)}
>
	{#if header}
		<div
			data-slot="header"
			data-scroll="fixed"
			bind:offsetHeight={headerHeight}
			class={cn(
				'pt-8 pb-6',
				stickyHeader && 'bg-background md:sticky md:top-0 md:z-10 md:border-b',
				stickyHeader && (stuck ? 'md:border-border' : 'md:border-transparent')
			)}
		>
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
