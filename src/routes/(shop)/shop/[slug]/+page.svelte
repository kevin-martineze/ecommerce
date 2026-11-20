<script lang="ts">
	// Tipos
	import type { ActionData, PageData } from './$types';

	// Librerías
	import { toast } from 'svelte-sonner';

	// Iconos
	import BellRing from '@lucide/svelte/icons/bell-ring';
	import Heart from '@lucide/svelte/icons/heart';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';

	// App
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	// Componentes
	import * as Accordion from '$lib/components/atoms/accordion';
	import { Button } from '$lib/components/atoms/button';
	import { Input } from '$lib/components/atoms/input';
	import SplitLayout from '$lib/components/layouts/SplitLayout.svelte';
	import PriceTag from '$lib/components/molecules/PriceTag.svelte';
	import ShareMeta from '$lib/components/molecules/ShareMeta.svelte';
	import ProductGallery from '$lib/components/organisms/ProductGallery.svelte';
	import ProductGrid from '$lib/components/organisms/ProductGrid.svelte';
	import VariantPicker from '$lib/components/organisms/VariantPicker.svelte';

	// Estado
	import { cart } from '$lib/stores/cart.svelte';
	import { favorites } from '$lib/stores/favorites.svelte';
	import { FormState } from '$lib/utils/form-state.svelte';

	// Dominio
	import { absoluteUrl, productSharePreview } from '$lib/domain/share-preview';

	// Utilidades
	import { cn } from '$lib/utils';
	import { formatMoney } from '$lib/utils/money';
	import { buildProductInquiryUrl } from '$lib/utils/whatsapp';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	const product = $derived(data.product);

	/** Un valor elegido por eje, indexado por id del eje. */
	let selected = $state<Record<string, string>>({});
	let restockContact = $state('');
	const restock = new FormState();

	/**
	 * Al cambiar de producto se arranca en la primera variante con existencias.
	 *
	 * Se propone una combinación entera y no un valor suelto: con tres ejes,
	 * elegir solo el primero deja a el cliente ante dos listas sin nada
	 * seleccionado, y la de abajo tachada sin explicar por qué.
	 */
	$effect(() => {
		const first =
			product.variants.find((variantOption) => variantOption.stock > 0) ?? product.variants.at(0);

		selected = Object.fromEntries(
			product.options.flatMap((axis) => {
				const optionValue = axis.values.find((candidate) => first?.valueIds.includes(candidate.id));

				return optionValue ? [[axis.id, optionValue.id] as const] : [];
			})
		);
	});

	const selectedVariant = $derived.by(() => {
		const chosenItems = Object.values(selected);

		if (chosenItems.length !== product.options.length) return null;

		return (
			product.variants.find(
				(variantOption) =>
					variantOption.valueIds.length === chosenItems.length &&
					chosenItems.every((optionValue) => variantOption.valueIds.includes(optionValue))
			) ?? null
		);
	});

	const price = $derived(selectedVariant?.price ?? product.basePrice);
	const isFavorite = $derived(favorites.has(product.slug));
	const outOfStock = $derived(selectedVariant !== null && selectedVariant.stock === 0);
	const productUrl = $derived(new URL(`/shop/${product.slug}`, page.url.origin).toString());

	const inquiryUrl = $derived(
		buildProductInquiryUrl(
			data.settings.whatsapp_phone,
			data.settings.store_name,
			product.name,
			productUrl
		)
	);

	function addToCart() {
		if (!selectedVariant || selectedVariant.stock === 0) {
			toast.error('Elige una combinación disponible.');
			return;
		}

		const tagLabel = product.options
			.map((axis) => axis.values.find((optionValue) => optionValue.id === selected[axis.id])?.value)
			.filter((optionValue): optionValue is string => Boolean(optionValue))
			.join(' · ');

		const image =
			product.images.find((item) =>
				item.option_value_id === null
					? false
					: selectedVariant.valueIds.includes(item.option_value_id)
			) ?? product.images.at(0);

		cart.add({
			variantId: selectedVariant.id,
			qty: 1,
			preview: {
				productName: product.name,
				productSlug: product.slug,
				variantLabel: tagLabel,
				unitPrice: selectedVariant.price,
				imageUrl: image?.url_thumb ?? null
			}
		});

		toast.success('Agregado al carrito');
	}

	// Escapar `<` evita que una descripción con HTML cierre la etiqueta script.
	const jsonLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'Product',
			name: product.name,
			description: product.description ?? undefined,
			image: product.images.map((image) => image.url_full),
			offers: {
				'@type': 'Offer',
				price: product.basePrice,
				priceCurrency: 'COP',
				availability: product.variants.some((variant) => variant.stock > 0)
					? 'https://schema.org/InStock'
					: 'https://schema.org/OutOfStock',
				url: productUrl
			}
		}).replace(/</g, '\u003c')
	);

	// La tarjeta al compartir la ficha: con la dirección pública de la tienda,
	// no la del host que atendió la visita.
	const share = $derived(
		productSharePreview({
			storeName: data.settings.store_name,
			url: absoluteUrl(`/shop/${product.slug}`, data.public_url) ?? productUrl,
			name: product.name,
			description: product.description,
			image: product.images.at(0)?.url_full ?? null,
			logoUrl: data.settings.logo_url
		})
	);
</script>

<ShareMeta preview={share} />

<svelte:head>
	<title>{product.name} — {data.settings.store_name}</title>
	<meta name="description" content={product.description ?? product.name} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags, no-useless-escape -- JSON-LD propio, con `<` ya escapado -->
	{@html `<script type="application/ld+json">${jsonLd}<\/script>`}
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
	<nav class="text-muted-foreground mb-8 flex items-center gap-2 text-xs">
		<a href="/shop" class="hover:text-foreground">Tienda</a>
		{#if product.categorySlug}
			<span>/</span>
			<a href="/shop?category={product.categorySlug}" class="hover:text-foreground">
				{product.categoryName}
			</a>
		{/if}
	</nav>

	<SplitLayout variant="detail" data-preview-zone={data.draftPreview ? 'product-card' : undefined}>
		{#snippet side()}
			<div class="space-y-8">
				<header class="space-y-3">
					<h1 class="text-4xl md:text-5xl">{product.name}</h1>
					<PriceTag {price} compareAtPrice={product.compareAtPrice} size="lg" />
				</header>

				<VariantPicker
					options={product.options}
					variants={product.variants}
					{selected}
					onselect={(next) => (selected = next)}
				/>

				<div class="space-y-3">
					{#if outOfStock}
						<div class="border-border space-y-3 border p-4">
							<div class="flex items-center gap-2">
								<BellRing class="size-4" />
								<p class="text-sm font-medium">Esta variación está agotada</p>
							</div>

							{#if form?.restockOk}
								<p class="text-success text-sm">
									Listo. Te avisamos por este contacto cuando vuelva.
								</p>
							{:else}
								<form
									method="POST"
									action="?/notifyMe"
									class="flex gap-2"
									use:enhance={restock.submit({ onSettled: () => (restockContact = '') })}
								>
									<input type="hidden" name="variantId" value={selectedVariant?.id ?? ''} />
									<Input
										name="contact"
										bind:value={restockContact}
										placeholder="Tu WhatsApp o correo"
										aria-label="Contacto para avisarte"
										required
									/>
									<Button type="submit" variant="outline" disabled={restock.pending}>
										Avísame
									</Button>
								</form>

								{#if form?.restockError}
									<p class="text-destructive text-xs">{form.restockError}</p>
								{/if}
							{/if}
						</div>
					{:else}
						<Button
							type="button"
							size="lg"
							class="w-full"
							onclick={addToCart}
							disabled={selectedVariant === null}
						>
							<ShoppingBag class="mr-2 size-4" />
							{selectedVariant ? `Agregar — ${formatMoney(price)}` : 'Elige variación'}
						</Button>
					{/if}

					<div class="grid grid-cols-2 gap-3">
						<Button
							type="button"
							variant="outline"
							onclick={() => favorites.toggle(product.slug)}
							aria-pressed={isFavorite}
						>
							<Heart class={cn('mr-2 size-4', isFavorite && 'fill-foreground')} />
							{isFavorite ? 'Guardado' : 'Guardar'}
						</Button>

						<Button href={inquiryUrl} target="_blank" rel="noopener noreferrer" variant="outline">
							<MessageCircle class="mr-2 size-4" />
							Preguntar
						</Button>
					</div>
				</div>

				{#if product.description}
					<p class="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
				{/if}

				<Accordion.Root type="single" class="border-border border-t">
					<!-- Los datos del producto los pone quien vende: "Material" en ropa,
					     "ISBN" en una librería, "Origen" en café. -->
					{#each product.attributes as attribute (attribute.name)}
						<Accordion.Item value={attribute.name}>
							<Accordion.Trigger>{attribute.name}</Accordion.Trigger>
							<Accordion.Content>{attribute.value}</Accordion.Content>
						</Accordion.Item>
					{/each}

					<Accordion.Item
						value="envios"
						data-preview-zone={data.draftPreview ? 'shipping-info' : undefined}
					>
						<Accordion.Trigger>Envíos y pedido</Accordion.Trigger>
						<Accordion.Content>
							El pedido se confirma por WhatsApp. Elegimos juntos la forma de pago y el envío según
							tu ciudad.
							{#if data.settings.free_shipping_threshold}
								Envío gratis desde {formatMoney(data.settings.free_shipping_threshold)}.
							{/if}
						</Accordion.Content>
					</Accordion.Item>
				</Accordion.Root>
			</div>
		{/snippet}

		<ProductGallery
			images={product.images}
			productName={product.name}
			productSlug={product.slug}
			activeValueId={selectedVariant?.valueIds.at(0) ?? null}
		/>
	</SplitLayout>

	{#if data.related.length > 0}
		<section class="mt-24">
			<h2 class="mb-8 text-2xl md:text-3xl">También te puede gustar</h2>
			<ProductGrid products={data.related} />
		</section>
	{/if}
</div>

<!-- Barra fija de compra en móvil: el botón siempre a mano. -->
{#if !outOfStock}
	<div
		class="bg-background/95 border-border fixed inset-x-0 bottom-0 z-30 border-t p-3 backdrop-blur lg:hidden"
	>
		<Button
			type="button"
			class="w-full"
			size="lg"
			onclick={addToCart}
			disabled={selectedVariant === null}
		>
			<ShoppingBag class="mr-2 size-4" />
			{selectedVariant ? `Agregar — ${formatMoney(price)}` : 'Elige variación'}
		</Button>
	</div>
{/if}
