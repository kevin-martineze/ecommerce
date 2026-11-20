<!--
@component
Las etiquetas que leen WhatsApp, Instagram, Facebook y X al compartir un
enlace: título, descripción, imagen y nombre del sitio. Se arman con
`storeSharePreview` / `productSharePreview` y salen en el HTML del servidor,
que es lo único que ven los rastreadores.
-->
<script lang="ts">
	// Tipos
	import type { SharePreview } from '$lib/domain/share-preview';

	interface Props {
		preview: SharePreview;
	}

	let { preview }: Props = $props();
</script>

<svelte:head>
	<meta property="og:type" content={preview.type} />
	<meta property="og:locale" content="es_CO" />
	<meta property="og:site_name" content={preview.siteName} />
	<meta property="og:title" content={preview.title} />
	<meta property="og:description" content={preview.description} />
	<meta property="og:url" content={preview.url} />
	{#if preview.image}
		<meta property="og:image" content={preview.image} />
		<meta property="og:image:alt" content={preview.title} />
	{/if}
	<meta name="twitter:card" content={preview.card} />
	<meta name="twitter:title" content={preview.title} />
	<meta name="twitter:description" content={preview.description} />
	{#if preview.image}
		<meta name="twitter:image" content={preview.image} />
	{/if}
</svelte:head>
