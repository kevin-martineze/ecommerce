<script lang="ts">
	// App
	import { page } from '$app/state';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import ErrorTemplate from '$lib/components/templates/ErrorTemplate.svelte';

	const isNotFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{isNotFound ? 'Página no encontrada' : 'Algo salió mal'}</title>
</svelte:head>

<ErrorTemplate
	status={page.status}
	title={isNotFound ? 'No encontramos esta página' : 'Algo salió mal'}
	message={isNotFound
		? 'Puede que el producto ya no esté disponible o que el enlace haya cambiado.'
		: (page.error?.message ?? 'Vuelve a intentarlo en un momento.')}
>
	{#snippet actions()}
		<Button href="/">Ir al inicio</Button>
		<Button href="/shop" variant="outline">Ver la tienda</Button>
	{/snippet}
</ErrorTemplate>
