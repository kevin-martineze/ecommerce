<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	// Svelte
	import { setContext } from 'svelte';

	// App
	import { page } from '$app/state';

	// Componentes
	import PreviewEditable from '$lib/components/molecules/PreviewEditable.svelte';
	import PreviewFocus from '$lib/components/molecules/PreviewFocus.svelte';
	import CartDrawer from '$lib/components/organisms/CartDrawer.svelte';
	import StoreAssistant from '$lib/components/organisms/StoreAssistant.svelte';
	import TemplatePreviewBar from '$lib/components/organisms/TemplatePreviewBar.svelte';
	import StorefrontTemplate from '$lib/components/templates/StorefrontTemplate.svelte';

	// Estado
	import { cart } from '$lib/stores/cart.svelte';
	import { favorites } from '$lib/stores/favorites.svelte';
	import { storefrontDraft } from '$lib/stores/storefront-draft.svelte';

	// Dominio
	import { CARD_LOOK, cardLookOf } from '$lib/domain/card-look';
	import { templateOf } from '$lib/domain/templates';

	interface Props {
		data: LayoutData;
		children: Snippet;
	}

	let { data, children }: Props = $props();

	// Carrito y favoritos viven en localStorage: se hidratan al montar en cliente.
	$effect(() => {
		cart.hydrate();
		favorites.hydrate();
	});

	// Dentro del editor de diseño la tienda se viste con el borrador que llega
	// por `postMessage`; fuera de él, `apply` devuelve los ajustes tal cual.
	$effect(() => {
		if (data.draftPreview) storefrontDraft.listen();
	});

	const settings = $derived(storefrontDraft.apply(data.settings));
	const categories = $derived(storefrontDraft.applyCategories(data.categories));

	// La dirección canónica es la pública de la tienda (dominio propio si lo tiene), nunca `PUBLIC_SITE_URL`.
	const canonical = $derived(`${data.public_url.replace(/\/+$/, '')}${page.url.pathname}`);

	// Lo que la plantilla decide dentro de cada tarjeta (ver card-look.ts).
	setContext(CARD_LOOK, {
		get swatchLimit() {
			return cardLookOf(templateOf(settings.template)).swatchLimit;
		}
	});
</script>

<svelte:head>
	<link rel="canonical" href={canonical} />
	{#if data.previewTemplate}
		<!-- Una tienda con un vestido de prueba no es la tienda: que no la indexen. -->
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

<StorefrontTemplate
	{settings}
	{categories}
	collections={data.collections}
	draftPreview={data.draftPreview}
>
	{@render children()}
</StorefrontTemplate>

{#if data.draftPreview}
	<!-- Solo dentro del editor: resalta la zona que el módulo está editando. -->
	<PreviewFocus />
	<PreviewEditable />
{/if}

<CartDrawer />

{#if data.previewTemplate}
	<TemplatePreviewBar template={data.previewTemplate} />
{/if}

{#if data.settings.assistant}
	<!-- Solo si el plan de la tienda lo incluye y la plataforma lo tiene
	     encendido: el botón no aparece para prometer algo que no responde. -->
	<StoreAssistant
		storeName={data.settings.store_name}
		whatsappPhone={data.settings.whatsapp_phone}
	/>
{/if}
