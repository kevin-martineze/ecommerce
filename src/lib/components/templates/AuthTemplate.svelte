<!--
@component
Las pantallas de acceso de Globerce: `AuthLayout` con la marca fija. La página
solo pone el título y el formulario.
-->
<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';

	// Componentes
	import AuthLayout from '$lib/components/layouts/AuthLayout.svelte';
	import GloberceMark from '$lib/components/molecules/GloberceMark.svelte';

	interface Props {
		title: string;
		eyebrow?: string;
		/**
		 * Ancho del contenido: el registro necesita bastante más que el login,
		 * porque enseña los tres planes uno al lado del otro y a 672px quedan
		 * tan angostos que no se leen.
		 */
		wide?: boolean;
		children: Snippet;
		footer?: Snippet;
	}

	let { title, eyebrow = 'Globerce', wide = false, children, footer }: Props = $props();
</script>

<!-- La entrada es de Globerce, no del panel: lleva su marca. -->
<AuthLayout class="marketing" width={wide ? 'wide' : 'narrow'} {footer}>
	{#snippet header()}
		<!-- El isotipo lleva a la portada: desde el registro o el login es
		     la salida natural si alguien llegó sin querer. -->
		<a href="/" class="mx-auto mb-4 block w-fit" aria-label="Globerce, inicio">
			<GloberceMark size={44} label="" />
		</a>
		<p class="eyebrow">{eyebrow}</p>
		<h1 class="text-3xl">{title}</h1>
	{/snippet}

	{@render children()}
</AuthLayout>
