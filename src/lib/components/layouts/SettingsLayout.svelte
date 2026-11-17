<!--
@component
Layout de las secciones de ajustes: una navegación secundaria fija y el
contenido, que hace scroll dentro del layout padre (el del panel).

Desde `lg` la navegación va a la izquierda y se queda en su sitio; en
celular va arriba, en una fila que se desliza de lado. Contrato de GlobUI:
`data-layout`, y cada slot con `data-slot` y `data-scroll`.
-->
<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';

	// Utilidades
	import { cn } from '$lib/utils';

	interface Props {
		/** La navegación entre secciones de ajustes. */
		nav: Snippet;
		children: Snippet;
		class?: string;
	}

	let { nav, children, class: className }: Props = $props();
</script>

<div
	data-layout="settings"
	class={cn('grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10', className)}
>
	<nav
		data-slot="nav"
		data-scroll="fixed"
		aria-label="Secciones de ajustes"
		class="-mx-4 overflow-x-auto px-4 lg:sticky lg:top-6 lg:mx-0 lg:self-start lg:overflow-visible lg:px-0"
	>
		{@render nav()}
	</nav>

	<div data-slot="content" data-scroll="scroll" class="min-w-0">
		{@render children()}
	</div>
</div>
