<!--
@component
Layout de las pantallas de acceso (entrar, recuperar, invitación, registro)
y de las de error.

Modo documento: la página hace scroll como un documento y el contenido va
centrado. Contrato de GlobUI: `data-layout`, y cada slot con `data-slot` y
`data-scroll`. No pinta contenido propio.
-->
<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';

	// Utilidades
	import { cn } from '$lib/utils';

	interface Props {
		/** La cabecera: marca y título. */
		header?: Snippet;
		children: Snippet;
		/** Una línea al pie: enlaces legales, «¿ya tienes cuenta?». */
		footer?: Snippet;
		/** El ancho del contenido: `wide` para pantallas con tablas o planes lado a lado. */
		width?: 'narrow' | 'medium' | 'wide';
		class?: string;
	}

	let { header, children, footer, width = 'narrow', class: className }: Props = $props();
</script>

<main data-layout="auth" class={cn('grid min-h-dvh place-items-center px-4 py-10', className)}>
	<div
		class={cn(
			'w-full space-y-8',
			width === 'wide' ? 'max-w-4xl' : width === 'medium' ? 'max-w-xl' : 'max-w-sm'
		)}
	>
		{#if header}
			<header data-slot="header" data-scroll="fixed" class="space-y-2 text-center">
				{@render header()}
			</header>
		{/if}

		<div data-slot="content" data-scroll="scroll">
			{@render children()}
		</div>

		{#if footer}
			<footer
				data-slot="footer"
				data-scroll="fixed"
				class="text-muted-foreground text-center text-xs"
			>
				{@render footer()}
			</footer>
		{/if}
	</div>
</main>
