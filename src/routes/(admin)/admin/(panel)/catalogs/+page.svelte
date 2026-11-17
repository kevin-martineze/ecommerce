<script lang="ts">
	// Tipos
	import type { StorefrontDraft } from '$lib/domain/preview';
	import type { PageData } from './$types';

	// Svelte
	import { untrack } from 'svelte';

	// Iconos
	import Trash2 from '@lucide/svelte/icons/trash-2';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import * as Card from '$lib/components/atoms/card';
	import { Input } from '$lib/components/atoms/input';
	import { Label } from '$lib/components/atoms/label';
	import CheckboxField from '$lib/components/molecules/CheckboxField.svelte';
	import NumberField from '$lib/components/molecules/NumberField.svelte';
	import ConfirmDeleteDialog from '$lib/components/organisms/ConfirmDeleteDialog.svelte';
	import EditableRowCard from '$lib/components/organisms/EditableRowCard.svelte';
	import PreviewTemplate from '$lib/components/templates/PreviewTemplate.svelte';

	// Estado
	import { DeleteConfirm } from '$lib/utils/delete-confirm.svelte';

	// Utilidades
	import { themePreviewUrl } from '$lib/template-preview';
	import { slugify } from '$lib/utils/slug';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	/** El siguiente lugar libre, para que dos filas no compartan orden. */
	function nextOrder(rows: { sort_order: number }[]): number {
		return rows.reduce((max, row) => Math.max(max, row.sort_order), 0) + 1;
	}

	function categoryUsage(id: string): number {
		return data.usage.categories[id] ?? 0;
	}

	/**
	 * Los cambios de cada fila viven aquí, por id. Así la lista sigue pintando
	 * lo guardado y lo que la dueña escribe se suma sin tocar `data`.
	 */
	interface CategoryEdit {
		name?: string;
		sortOrder?: number;
		active?: boolean;
	}

	let categoryEdits = $state<Record<string, CategoryEdit>>({});

	// La categoría que se está creando también se ve, sin esperar a guardarla.
	let newName = $state('');
	let newSortOrder = $state(untrack(() => nextOrder(data.categories)));
	let newActive = $state(true);

	const rows = $derived(
		data.categories.map((category) => ({
			id: category.id,
			name: categoryEdits[category.id]?.name ?? category.name,
			slug: category.slug,
			sortOrder: categoryEdits[category.id]?.sortOrder ?? category.sort_order,
			active: categoryEdits[category.id]?.active ?? category.active
		}))
	);

	const draftCategories = $derived([
		...rows,
		...(newName.trim()
			? [
					{
						id: 'nueva',
						name: newName,
						slug: slugify(newName),
						sortOrder: newSortOrder,
						active: newActive
					}
				]
			: [])
	]);

	const draft = $derived<StorefrontDraft>({
		template: data.settings.template,
		theme: data.settings.theme,
		content: { kind: 'categories', categories: draftCategories },
		focus: 'categories-menu'
	});

	const previewSrc = $derived(
		themePreviewUrl(
			new URL('/', data.previewUrl).toString(),
			data.settings.template,
			data.settings.theme
		)
	);

	function editCategory(id: string, patch: CategoryEdit) {
		categoryEdits[id] = { ...categoryEdits[id], ...patch };
	}
	const deletion = new DeleteConfirm();
	const onDelete = deletion.enhance();
</script>

<svelte:head>
	<title>Categorías — Globerce</title>
</svelte:head>

<PreviewTemplate title="Categorías" src={previewSrc} {draft} previewTitle="Así se ve tu menú">
	{#snippet intro()}
		<p>
			Cómo agrupas tus productos en la tienda. Lo que ya esté en uso no se borra: se oculta, y los
			pedidos viejos lo siguen mostrando.
		</p>
		<p>
			Las variaciones, los colores y cualquier otra variación se declaran en cada producto, porque
			no todos se dividen igual: una camisa por variación, un café por molienda y peso, un libro por
			nada.
		</p>
	{/snippet}

	<div class="space-y-8">
		<Card.Root>
			<Card.Header>
				<Card.Title>Categorías</Card.Title>
				<Card.Description>Aparecen en el menú de la tienda.</Card.Description>
			</Card.Header>

			<Card.Content class="space-y-4">
				<form
					method="POST"
					action="?/createCategory"
					class="bg-muted/50 flex flex-wrap items-end gap-3 rounded-lg p-4"
					use:enhance
				>
					<div class="space-y-1.5">
						<Label class="text-xs" for="cat-name">Nombre</Label>
						<Input
							id="cat-name"
							name="name"
							required
							placeholder="Chaquetas"
							class="w-56"
							bind:value={newName}
						/>
					</div>

					<div class="space-y-1.5">
						<Label class="text-xs" for="cat-order">Orden</Label>
						<NumberField id="cat-order" name="sortOrder" bind:value={newSortOrder} class="w-32" />
					</div>

					<div class="pb-2">
						<CheckboxField
							id="nueva-categoria"
							name="active"
							label="Visible"
							bind:checked={newActive}
						/>
					</div>

					<Button type="submit" size="sm">Agregar categoría</Button>
				</form>

				<div class="space-y-4">
					{#each rows as category (category.id)}
						{@const inUse = categoryUsage(category.id)}
						<EditableRowCard>
							<div class="grid gap-4 md:grid-cols-2">
								<div class="space-y-1.5">
									<Label for="cat-nombre-{category.id}">Nombre</Label>
									<Input
										id="cat-nombre-{category.id}"
										form="categoria-{category.id}"
										name="name"
										value={category.name}
										oninput={(event) =>
											editCategory(category.id, { name: event.currentTarget.value })}
									/>
								</div>

								<div class="space-y-1.5">
									<p class="text-sm font-medium">Enlace</p>
									<p class="text-muted-foreground flex h-9 items-center font-mono text-xs">
										/{category.slug}
									</p>
								</div>
							</div>

							<div class="flex flex-wrap items-end gap-4">
								<div class="space-y-1.5">
									<Label for="cat-orden-{category.id}">Orden</Label>
									<NumberField
										id="cat-orden-{category.id}"
										form="categoria-{category.id}"
										name="sortOrder"
										value={category.sortOrder}
										onchange={(value) => editCategory(category.id, { sortOrder: value })}
										class="w-32"
									/>
								</div>

								<div class="pb-2">
									<CheckboxField
										id="cat-visible-{category.id}"
										form="categoria-{category.id}"
										name="active"
										label="Visible"
										checked={category.active}
										onchange={(checked) => editCategory(category.id, { active: checked })}
									/>
								</div>

								<p class="text-muted-foreground pb-2 text-xs">
									{inUse > 0 ? `${inUse} productos` : 'sin usar'}
								</p>
							</div>

							{#snippet actionList()}
								<Button type="submit" form="categoria-{category.id}" size="sm" variant="outline">
									Guardar
								</Button>

								<Button
									type="button"
									onclick={() =>
										deletion.ask(`borrar-categoria-${category.id}`, `¿Borrar ${category.name}?`, {
											description: 'Lo que ya esté en uso no se borra: se oculta.'
										})}
									size="sm"
									variant="ghost"
									class="text-destructive"
									aria-label="Borrar {category.name}"
								>
									<Trash2 class="size-3" />
									Borrar
								</Button>
							{/snippet}
						</EditableRowCard>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</PreviewTemplate>

<!--
	Los formularios de cada fila viven fuera de la lista, en un bloque oculto:
	los campos los referencian por id.
-->
<div hidden>
	{#each data.categories as category (category.id)}
		<form id="categoria-{category.id}" method="POST" action="?/updateCategory" use:enhance>
			<input type="hidden" name="id" value={category.id} />
		</form>
		<form
			id="borrar-categoria-{category.id}"
			method="POST"
			action="?/deleteCategory"
			use:enhance={onDelete}
		>
			<input type="hidden" name="id" value={category.id} />
		</form>
	{/each}
</div>

<ConfirmDeleteDialog
	bind:open={deletion.open}
	title={deletion.target?.title ?? ''}
	description={deletion.target?.description}
	form={deletion.target?.formId ?? ''}
	confirmLabel={deletion.target?.confirmLabel}
	pendingLabel={deletion.target?.pendingLabel}
	pending={deletion.pending}
/>
