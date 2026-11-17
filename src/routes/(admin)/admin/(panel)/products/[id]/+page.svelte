<script lang="ts">
	// Tipos
	import type { StorefrontDraft } from '$lib/domain/preview';
	import type { ProductFormValues } from '$lib/domain/product-form';
	import type { ActionData, PageData } from './$types';

	// Svelte
	import { untrack } from 'svelte';

	// Iconos
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Star from '@lucide/svelte/icons/star';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import { Input } from '$lib/components/atoms/input';
	import { Label } from '$lib/components/atoms/label';
	import * as Tabs from '$lib/components/atoms/tabs';
	import FormFeedback from '$lib/components/molecules/FormFeedback.svelte';
	import SelectField from '$lib/components/molecules/SelectField.svelte';
	import ConfirmDeleteDialog from '$lib/components/organisms/ConfirmDeleteDialog.svelte';
	import OptionEditor from '$lib/components/organisms/OptionEditor.svelte';
	import ProductForm from '$lib/components/organisms/ProductForm.svelte';
	import VariantMatrix from '$lib/components/organisms/VariantMatrix.svelte';
	import PreviewTemplate from '$lib/components/templates/PreviewTemplate.svelte';

	// Estado
	import { DeleteConfirm } from '$lib/utils/delete-confirm.svelte';
	import { FormState } from '$lib/utils/form-state.svelte';

	// Utilidades
	import { themePreviewUrl } from '$lib/template-preview';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	const product = $derived(data.product);
	const images = $derived([...product.product_images].sort((a, b) => a.sort_order - b.sort_order));

	// Copia editable de la ficha; la vista previa la lee sin tocar `data`.
	let live = $state<ProductFormValues>(
		untrack(() => ({
			name: product.name,
			slug: product.slug,
			description: product.description ?? '',
			categoryId: product.category_id ?? '',
			basePrice: product.base_price,
			compareAtPrice: product.compare_at_price,
			status: product.status,
			featured: product.featured
		}))
	);

	/** La foto que se acaba de elegir, antes de subirla. */
	let draftImage = $state<Blob | null>(null);

	const draft = $derived<StorefrontDraft>({
		template: data.settings.template,
		theme: data.settings.theme,
		content: {
			kind: 'product',
			name: live.name,
			slug: live.slug,
			description: live.description,
			categoryId: live.categoryId || null,
			basePrice: typeof live.basePrice === 'number' ? live.basePrice : 0,
			compareAtPrice: typeof live.compareAtPrice === 'number' ? live.compareAtPrice : null,
			status: live.status,
			featured: live.featured,
			image: draftImage
		},
		focus: 'product-card'
	});

	const previewSrc = $derived.by(() => {
		const url = new URL('/preview/product', data.previewUrl);
		url.searchParams.set('product', product.slug);

		return themePreviewUrl(url.toString(), data.settings.template, data.settings.theme);
	});

	let uploadOptionValueId = $state('');

	/**
	 * A qué valor corresponde la foto.
	 *
	 * Solo se ofrecen los valores con tono: asociar una foto a "500 g" no
	 * significa nada, pero a "Rojo" sí — es la foto de el producto roja.
	 */
	const valueOptions = $derived([
		{ value: '', label: 'Todas' },
		...product.options.flatMap((axis) =>
			axis.values
				.filter((optionValue) => optionValue.hex !== null)
				.map((optionValue) => ({
					value: optionValue.id,
					label: `${axis.name}: ${optionValue.value}`
				}))
		)
	]);

	/** El nombre de un valor, para etiquetar la foto ya subida. */
	function valueName(id: string): string {
		for (const axis of product.options) {
			const optionValue = axis.values.find((candidate) => candidate.id === id);

			if (optionValue) return optionValue.value;
		}

		return '';
	}
	const upload = new FormState();
	const deletion = new DeleteConfirm();
	const onDelete = deletion.enhance();
</script>

<svelte:head>
	<title>{product.name} — Globerce</title>
</svelte:head>

<PreviewTemplate
	title={product.name}
	back={{ href: '/admin/products', label: 'Productos' }}
	src={previewSrc}
	{draft}
	previewTitle="Así se ve tu producto"
>
	{#snippet actions()}
		<Button
			href="{data.storeUrl}/shop/{product.slug}"
			target="_blank"
			rel="noopener noreferrer"
			variant="outline"
		>
			<ExternalLink class="mr-2 size-4" />
			Ver en la tienda
		</Button>
	{/snippet}

	<FormFeedback error={form?.error ?? null} />

	<Tabs.Root value="details">
		<Tabs.List>
			<Tabs.Trigger value="details">Datos</Tabs.Trigger>
			<Tabs.Trigger value="photos">Fotos ({images.length})</Tabs.Trigger>
			<Tabs.Trigger value="variants">Variaciones y stock ({product.variants.length})</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="details" class="pt-6">
			<div class="border-border bg-card rounded-lg border p-6">
				<ProductForm
					categories={data.categories}
					action="?/update"
					submitLabel="Guardar cambios"
					error={null}
					values={live}
					onvalues={(values) => (live = { ...values })}
				/>
			</div>

			<div class="border-destructive/40 mt-8 max-w-3xl rounded-lg border p-6">
				<h2 class="text-lg">Eliminar producto</h2>
				<p class="text-muted-foreground mt-1 text-sm">
					Si el producto ya salió en pedidos no se borra: se archiva para conservar el historial.
				</p>

				<form
					id="delete-product"
					method="POST"
					action="?/delete"
					class="mt-4"
					use:enhance={onDelete}
				>
					<Button
						type="button"
						variant="destructive"
						size="sm"
						onclick={() =>
							deletion.ask('delete-product', '¿Eliminar este producto?', {
								description:
									'Si ya salió en pedidos no se borra: se archiva para conservar el historial.',
								confirmLabel: 'Eliminar',
								pendingLabel: 'Eliminando…'
							})}
					>
						<Trash2 class="mr-2 size-4" />
						Eliminar
					</Button>
				</form>
			</div>
		</Tabs.Content>

		<Tabs.Content value="photos" class="pt-6">
			<div class="border-border bg-card rounded-lg space-y-6 border p-6">
				<form
					method="POST"
					action="?/uploadImage"
					enctype="multipart/form-data"
					class="flex flex-wrap items-end gap-3"
					use:enhance={upload.submit()}
				>
					<div class="space-y-2">
						<Label for="file">Nueva foto</Label>
						<Input
							id="file"
							name="file"
							type="file"
							accept="image/*"
							required
							class="w-64"
							onchange={(event) => (draftImage = event.currentTarget.files?.[0] ?? null)}
						/>
					</div>

					<div class="space-y-2">
						<Label for="colorId">Color (opcional)</Label>
						<SelectField
							id="colorId"
							name="optionValueId"
							bind:value={uploadOptionValueId}
							class="w-44"
							placeholder="Todas"
							options={valueOptions}
						/>
					</div>

					<Button type="submit" disabled={upload.pending}>
						{upload.pending ? 'Procesando…' : 'Subir'}
					</Button>

					<p class="text-muted-foreground w-full text-xs">
						Se guardan tres tamaños (400, 800 y 1600 px) en WebP. Máximo 12 MB por foto.
					</p>
				</form>

				{#if images.length === 0}
					<p class="text-muted-foreground text-sm">Este producto todavía no tiene fotos.</p>
				{:else}
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
						{#each images as image, index (image.id)}
							<div class="space-y-2">
								<div class="relative">
									<img
										src={image.url_card}
										alt=""
										class="bg-muted aspect-[3/4] w-full object-cover"
									/>

									{#if index === 0}
										<span
											class="bg-primary text-primary-foreground absolute top-2 left-2 px-2 py-0.5 text-[10px]"
										>
											Principal
										</span>
									{/if}
								</div>

								<div class="flex gap-1">
									{#if index !== 0}
										<form method="POST" action="?/mainImage" class="flex-1" use:enhance>
											<input type="hidden" name="imageId" value={image.id} />
											<Button type="submit" size="sm" variant="outline" class="w-full">
												<Star class="mr-1 size-3" />
												Principal
											</Button>
										</form>
									{/if}

									<form
										id="borrar-imagen-{image.id}"
										method="POST"
										action="?/deleteImage"
										use:enhance={onDelete}
									>
										<input type="hidden" name="imageId" value={image.id} />
										<Button
											type="button"
											size="sm"
											variant="ghost"
											class="text-destructive"
											aria-label="Borrar foto"
											onclick={() =>
												deletion.ask(`borrar-imagen-${image.id}`, '¿Borrar esta foto?', {
													description: 'No se puede deshacer.'
												})}
										>
											<Trash2 class="size-3" />
										</Button>
									</form>
								</div>

								{#if image.option_value_id}
									<p class="text-muted-foreground text-xs">
										{valueName(image.option_value_id)}
									</p>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</Tabs.Content>

		<Tabs.Content value="variants" class="pt-6">
			<div class="space-y-6">
				<OptionEditor options={product.options} />

				<VariantMatrix
					options={product.options}
					variants={product.variants}
					basePrice={product.base_price}
				/>
			</div>
		</Tabs.Content>
	</Tabs.Root>

	<ConfirmDeleteDialog
		bind:open={deletion.open}
		title={deletion.target?.title ?? ''}
		description={deletion.target?.description}
		form={deletion.target?.formId ?? ''}
		confirmLabel={deletion.target?.confirmLabel}
		pendingLabel={deletion.target?.pendingLabel}
		pending={deletion.pending}
	/>
</PreviewTemplate>
