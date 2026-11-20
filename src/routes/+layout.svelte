<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';

	// App
	import { onNavigate } from '$app/navigation';
	import { page } from '$app/state';

	// Componentes
	import { Toaster } from '$lib/components/atoms/sonner';

	// Recursos
	import '../app.css';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// Transición suave entre páginas donde el navegador la soporte.
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	// La vitrina pone el icono de su tienda (ver `(shop)/+layout.svelte`): el
	// de Globerce es para el resto del sitio, nunca para una tienda.
	const storefront = $derived(page.route.id?.startsWith('/(shop)') ?? false);
</script>

<svelte:head>
	{#if !storefront}
		<!-- El navegador guarda el favicon en caché con más ganas que cualquier
		     otro recurso: al cambiar el dibujo hay que subir esta versión. -->
		<link rel="icon" href="/favicon.png?v=4" type="image/png" />
		<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=4" />
	{/if}
</svelte:head>

<Toaster position="bottom-right" />

{@render children()}
