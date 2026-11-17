<script lang="ts">
	// Tipos
	import type { PageData } from './$types';

	// Iconos
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { Badge } from '$lib/components/atoms/badge';
	import { Button } from '$lib/components/atoms/button';
	import * as Card from '$lib/components/atoms/card';
	import { Input } from '$lib/components/atoms/input';
	import { Label } from '$lib/components/atoms/label';
	import * as Table from '$lib/components/atoms/table';
	import { Textarea } from '$lib/components/atoms/textarea';
	import CheckboxField from '$lib/components/molecules/CheckboxField.svelte';
	import NumberField from '$lib/components/molecules/NumberField.svelte';
	import SelectField from '$lib/components/molecules/SelectField.svelte';
	import ConfirmDeleteDialog from '$lib/components/organisms/ConfirmDeleteDialog.svelte';
	import LivePreviewLayout from '$lib/components/organisms/LivePreviewLayout.svelte';

	// Estado
	import { DeleteConfirm } from '$lib/utils/delete-confirm.svelte';
	import { CollectionDraft } from './collection-draft.svelte';

	// Utilidades

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const productOptions = $derived(
		data.products.map((product) => ({ value: product.id, label: product.name }))
	);

	const newCollection = new CollectionDraft(() => data);

	function linksOf(collectionId: string) {
		return data.links.filter((link) => link.collection_id === collectionId);
	}
	const deletion = new DeleteConfirm();
	const onDelete = deletion.enhance();
</script>

<svelte:head>
	<title>Colecciones — Globerce</title>
</svelte:head>

<header class="mb-6">
	<h1 class="text-3xl">Colecciones</h1>
	<p class="text-muted-foreground text-sm">
		Páginas editoriales con una foto grande y productos etiquetadas encima.
	</p>
</header>

<LivePreviewLayout
	src={newCollection.src}
	draft={newCollection.draft}
	title="Así se ve tu colección"
>
	<Card.Root class="mb-8">
		<Card.Header>
			<Card.Title>Nueva colección</Card.Title>
		</Card.Header>

		<Card.Content>
			<form
				method="POST"
				action="?/create"
				enctype="multipart/form-data"
				class="grid gap-4 sm:grid-cols-2"
				use:enhance={newCollection.create}
			>
				<div class="space-y-2">
					<Label for="name">Nombre</Label>
					<Input
						id="name"
						name="name"
						required
						placeholder="Temporada clara"
						bind:value={newCollection.name}
					/>
				</div>

				<div class="space-y-2">
					<Label for="slug">Slug (opcional)</Label>
					<Input
						id="slug"
						name="slug"
						placeholder="temporada-clara"
						pattern="[a-z0-9-]+"
						bind:value={newCollection.slug}
					/>
				</div>

				<div class="space-y-2 sm:col-span-2">
					<Label for="file">Foto principal</Label>
					<Input
						id="file"
						name="file"
						type="file"
						accept="image/*"
						onchange={(event) => (newCollection.image = event.currentTarget.files?.[0] ?? null)}
					/>
					<p class="text-muted-foreground text-xs">
						Se guarda en tres tamaños para que cargue rápido. Máximo 12 MB.
					</p>
				</div>

				<div class="space-y-2 sm:col-span-2">
					<Label for="description">Descripción</Label>
					<Textarea
						id="description"
						name="description"
						rows={2}
						bind:value={newCollection.description}
					/>
				</div>

				<div class="sm:col-span-2">
					<CheckboxField
						id="active"
						name="active"
						label="Publicada"
						bind:checked={newCollection.active}
					/>
				</div>

				<div class="sm:col-span-2">
					<Button type="submit" disabled={newCollection.createForm.pending}>
						{newCollection.createForm.pending ? 'Creando…' : 'Crear colección'}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</LivePreviewLayout>

{#if data.collections.length === 0}
	<p
		class="text-muted-foreground border-border border border-dashed px-6 py-16 text-center text-sm"
	>
		Todavía no hay colecciones.
	</p>
{:else}
	<div class="space-y-6">
		{#each data.collections as collection (collection.id)}
			<Card.Root>
				<Card.Header>
					<div class="flex flex-wrap items-center gap-3">
						{#if collection.hero_image_url}
							<img
								src={collection.hero_image_url}
								alt=""
								class="bg-muted size-14 rounded-md object-cover"
							/>
						{/if}

						<div class="min-w-0 flex-1">
							<Card.Title class="text-base">{collection.name}</Card.Title>
							<Card.Description class="font-mono text-xs">
								/collections/{collection.slug}
							</Card.Description>
						</div>

						{#if !collection.active}
							<Badge variant="outline">Oculta</Badge>
						{/if}

						<Button
							href="{data.storeUrl}/collections/{collection.slug}"
							rel="noopener noreferrer"
							target="_blank"
							size="sm"
							variant="outline"
						>
							Ver
						</Button>

						<form
							method="POST"
							action="?/changePhoto"
							enctype="multipart/form-data"
							class="flex items-center gap-2"
							use:enhance
						>
							<input type="hidden" name="id" value={collection.id} />
							<Input
								name="file"
								type="file"
								accept="image/*"
								class="w-48"
								aria-label="Nueva foto de {collection.name}"
							/>
							<Button type="submit" size="sm" variant="outline">
								<ImagePlus class="mr-1 size-3" />
								Cambiar foto
							</Button>
						</form>

						<form
							id="borrar-coleccion-{collection.id}"
							method="POST"
							action="?/delete"
							use:enhance={onDelete}
						>
							<input type="hidden" name="id" value={collection.id} />
							<Button
								type="button"
								onclick={() =>
									deletion.ask(
										`borrar-coleccion-${collection.id}`,
										`¿Borrar la colección ${collection.name}?`,
										{
											description:
												'Los productos no se borran; solo deja de existir esta colección.'
										}
									)}
								size="sm"
								variant="ghost"
								class="text-destructive"
								aria-label="Borrar {collection.name}"
							>
								<Trash2 class="size-3" />
							</Button>
						</form>
					</div>
				</Card.Header>

				<Card.Content class="space-y-4">
					{#if linksOf(collection.id).length > 0}
						<Table.Root class="table-stack">
							<Table.Header>
								<Table.Row>
									<Table.Head>Producto</Table.Head>
									<Table.Head class="w-56">Etiqueta sobre la foto</Table.Head>
									<Table.Head class="w-28"></Table.Head>
								</Table.Row>
							</Table.Header>

							<Table.Body>
								{#each linksOf(collection.id) as link (link.product_id)}
									<Table.Row>
										<Table.Cell data-label="Producto" class="text-sm"
											>{link.products?.name ?? 'Producto'}</Table.Cell
										>

										<Table.Cell
											data-label="Etiqueta sobre la foto"
											class="text-muted-foreground text-xs"
										>
											{#if link.hotspot_x !== null && link.hotspot_y !== null}
												{link.hotspot_x}% / {link.hotspot_y}%
											{:else}
												sin etiquetar
											{/if}
										</Table.Cell>

										<Table.Cell data-label="">
											<Button
												type="button"
												onclick={() =>
													deletion.ask(
														`quitar-${collection.id}-${link.product_id}`,
														'¿Quitar este producto de la colección?',
														{
															description:
																'El producto sigue en la tienda; solo deja de salir en esta colección.',
															confirmLabel: 'Quitar',
															pendingLabel: 'Quitando…'
														}
													)}
												size="sm"
												variant="ghost"
												class="text-destructive"
											>
												Quitar
											</Button>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{/if}

					<form
						method="POST"
						action="?/addProduct"
						class="bg-muted/50 flex flex-wrap items-end gap-3 rounded-lg p-4"
						use:enhance
					>
						<input type="hidden" name="collectionId" value={collection.id} />

						<div class="space-y-1.5">
							<Label class="text-xs" for="product-{collection.id}">Producto</Label>
							<SelectField
								id="product-{collection.id}"
								name="productId"
								class="w-56"
								placeholder="Elige un producto"
								options={productOptions}
							/>
						</div>

						<div class="space-y-1.5">
							<Label class="text-xs" for="x-{collection.id}">Posición X (%)</Label>
							<NumberField
								id="x-{collection.id}"
								name="hotspotX"
								value={50}
								max={100}
								class="w-32"
							/>
						</div>

						<div class="space-y-1.5">
							<Label class="text-xs" for="y-{collection.id}">Posición Y (%)</Label>
							<NumberField
								id="y-{collection.id}"
								name="hotspotY"
								value={50}
								max={100}
								class="w-32"
							/>
						</div>

						<Button type="submit" size="sm" variant="outline">Agregar producto</Button>
					</form>
				</Card.Content>
			</Card.Root>

			<!-- El HTML no admite <form> dentro de <tbody>. -->
			<div hidden>
				{#each linksOf(collection.id) as link (link.product_id)}
					<form
						id="quitar-{collection.id}-{link.product_id}"
						method="POST"
						action="?/removeProduct"
						use:enhance={onDelete}
					>
						<input type="hidden" name="collectionId" value={collection.id} />
						<input type="hidden" name="productId" value={link.product_id} />
					</form>
				{/each}
			</div>
		{/each}
	</div>
{/if}

<ConfirmDeleteDialog
	bind:open={deletion.open}
	title={deletion.target?.title ?? ''}
	description={deletion.target?.description}
	form={deletion.target?.formId ?? ''}
	confirmLabel={deletion.target?.confirmLabel}
	pendingLabel={deletion.target?.pendingLabel}
	pending={deletion.pending}
/>
