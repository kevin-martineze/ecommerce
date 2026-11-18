<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';

	// App
	import { onNavigate } from '$app/navigation';

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
</script>

<Toaster position="bottom-right" />

{@render children()}
