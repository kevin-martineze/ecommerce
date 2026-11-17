<script lang="ts">
	import { untrack } from 'svelte';

	import Paintbrush from '@lucide/svelte/icons/paintbrush';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	import { enhance } from '$app/forms';

	import type { PageData } from './$types';
	import type { DraftHighlight, PreviewZone, StorefrontDraft } from '$lib/domain/preview';
	import { Badge } from '$lib/components/atoms/badge';
	import { Button } from '$lib/components/atoms/button';
	import * as Card from '$lib/components/atoms/card';
	import ConfirmDeleteDialog from '$lib/components/molecules/ConfirmDeleteDialog.svelte';
	import { Input } from '$lib/components/atoms/input';
	import { Label } from '$lib/components/atoms/label';
	import { Textarea } from '$lib/components/atoms/textarea';
	import CheckboxField from '$lib/components/molecules/CheckboxField.svelte';
	import NumberField from '$lib/components/molecules/NumberField.svelte';
	import SelectField from '$lib/components/molecules/SelectField.svelte';
	import EditableRowCard from '$lib/components/organisms/EditableRowCard.svelte';
	import LivePreviewLayout from '$lib/components/organisms/LivePreviewLayout.svelte';
	import { templateOf } from '$lib/domain/templates';
	import { isEmptyTheme } from '$lib/domain/theme';
	import { themePreviewUrl } from '$lib/template-preview';
	import { DeleteConfirm } from '$lib/utils/delete-confirm.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Copia editable del estado guardado; no se sincroniza sola.
	let heroCollectionId = $state(untrack(() => data.settings.hero_collection_id ?? ''));
	let heroTitle = $state(untrack(() => data.settings.hero_title ?? ''));
	let heroSubtitle = $state(untrack(() => data.settings.hero_subtitle ?? ''));

	/** Lo que se está editando, para que la vista previa resalte esa zona. */
	let focus = $state<PreviewZone>('hero');

	/**
	 * Los cambios de cada bloque viven aquí, por id. Así la lista sigue pintando
	 * lo guardado y lo que la dueña escribe se suma sin tocar `data`.
	 */
	interface HighlightEdit {
		eyebrow?: string;
		title?: string;
		body?: string;
		sortOrder?: number;
		active?: boolean;
	}

	let highlightEdits = $state<Record<string, HighlightEdit>>({});

	let newEyebrow = $state('');
	let newTitle = $state('');
	let newBody = $state('');
	let newOrder = $state(
		untrack(
			() => data.highlights.reduce((max, highlight) => Math.max(max, highlight.sort_order), 0) + 1
		)
	);
	let newActive = $state(true);

	const borrado = new DeleteConfirm();
	const alBorrar = borrado.enhance();

	const collectionOptions = $derived([
		{ value: '', label: 'Ninguna: usar mi propio título' },
		...data.collections.map((collection) => ({ value: collection.id, label: collection.name }))
	]);

	const chosenCollection = $derived(
		data.collections.find((collection) => collection.id === heroCollectionId) ?? null
	);

	/** Los bloques guardados con lo que se va escribiendo encima. */
	const rows = $derived(
		data.highlights.map((highlight) => ({
			id: highlight.id,
			eyebrow: highlightEdits[highlight.id]?.eyebrow ?? highlight.eyebrow,
			title: highlightEdits[highlight.id]?.title ?? highlight.title,
			body: highlightEdits[highlight.id]?.body ?? highlight.body,
			sortOrder: highlightEdits[highlight.id]?.sortOrder ?? highlight.sort_order,
			active: highlightEdits[highlight.id]?.active ?? highlight.active
		}))
	);

	/** El bloque que se está creando también se ve, sin esperar a guardarlo. */
	const draftHighlights = $derived<DraftHighlight[]>([
		...rows,
		...(newEyebrow.trim() || newTitle.trim() || newBody.trim()
			? [
					{
						id: 'nuevo',
						eyebrow: newEyebrow,
						title: newTitle,
						body: newBody,
						sortOrder: newOrder,
						active: newActive
					}
				]
			: [])
	]);

	const draft = $derived<StorefrontDraft>({
		template: data.settings.template,
		theme: data.settings.theme,
		content: {
			kind: 'home',
			heroCollectionId: heroCollectionId || null,
			heroTitle,
			heroSubtitle,
			highlights: draftHighlights
		},
		focus
	});

	const previewSrc = $derived(
		themePreviewUrl(
			new URL('/', data.previewUrl).toString(),
			data.settings.template,
			data.settings.theme
		)
	);

	function editHighlight(id: string, patch: HighlightEdit) {
		highlightEdits[id] = { ...highlightEdits[id], ...patch };
	}
</script>

<svelte:head>
	<title>Portada — Globerce</title>
</svelte:head>

<header class="mb-6 space-y-1">
	<h1 class="text-3xl">Portada</h1>
	<p class="text-muted-foreground text-sm">
		Lo que ve alguien que entra por primera vez: la imagen grande de arriba y los tres mensajes de
		abajo.
	</p>
</header>

<LivePreviewLayout src={previewSrc} {draft} title="Así se ve tu portada">
	<div class="space-y-8">
		<Card.Root>
			<Card.Header>
				<Card.Title>Diseño</Card.Title>
				<Card.Description>
					Tu tienda usa la plantilla {templateOf(data.settings.template).name}{isEmptyTheme(
						data.settings.theme
					)
						? ''
						: ', con tus ajustes'}. Cambia la plantilla, tu color, tus letras y la portada viendo
					cómo queda.
				</Card.Description>
				<Card.Action>
					<Button href="/admin/personalizar">
						<Paintbrush />
						Personalizar diseño
					</Button>
				</Card.Action>
			</Card.Header>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Imagen de arriba</Card.Title>
				<Card.Description>
					Elige una colección para que su foto y su nombre encabecen la tienda. Si no eliges
					ninguna, se usan el título y el texto que escribas aquí.
				</Card.Description>
			</Card.Header>

			<Card.Content>
				<form
					method="POST"
					action="?/hero"
					class="space-y-5"
					use:enhance
					onfocusin={() => (focus = 'hero')}
				>
					<div class="space-y-2">
						<Label for="heroCollectionId">Colección destacada</Label>
						<SelectField
							id="heroCollectionId"
							name="heroCollectionId"
							bind:value={heroCollectionId}
							class="max-w-md"
							placeholder="Ninguna: usar mi propio título"
							options={collectionOptions}
						/>

						{#if chosenCollection}
							<div class="flex items-center gap-3 pt-1">
								{#if chosenCollection.hero_image_url}
									<img
										src={chosenCollection.hero_image_url}
										alt=""
										class="bg-muted h-16 w-24 object-cover"
									/>
								{/if}
								<p class="text-muted-foreground text-xs">
									Se muestran la foto, el nombre y la descripción de esta colección.
									{#if !chosenCollection.active}
										<Badge variant="outline" class="ml-2">Está oculta en la tienda</Badge>
									{/if}
								</p>
							</div>
						{/if}
					</div>

					<div class="grid gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<Label for="heroTitle">Título propio</Label>
							<Input
								id="heroTitle"
								name="heroTitle"
								bind:value={heroTitle}
								maxlength={120}
								placeholder="Productos que duran más de una temporada"
								disabled={chosenCollection !== null}
							/>
						</div>

						<div class="space-y-2">
							<Label for="heroSubtitle">Texto de apoyo</Label>
							<Textarea
								id="heroSubtitle"
								name="heroSubtitle"
								rows={2}
								maxlength={300}
								bind:value={heroSubtitle}
								placeholder="Selección corta, materiales nobles y variaciones reales."
								disabled={chosenCollection !== null}
							/>
						</div>
					</div>

					<Button type="submit">Guardar portada</Button>
				</form>
			</Card.Content>
		</Card.Root>

		<div onfocusin={() => (focus = 'highlights')}>
			<Card.Root>
				<Card.Header>
					<Card.Title>Mensajes de abajo</Card.Title>
					<Card.Description>
						{data.highlights.length} bloques · se muestran en el orden que definas
					</Card.Description>
				</Card.Header>

				<Card.Content class="space-y-4">
					<form
						method="POST"
						action="?/crearBloque"
						class="bg-muted/50 flex flex-wrap items-end gap-3 rounded-lg p-4"
						use:enhance
					>
						<div class="space-y-1.5">
							<Label class="text-xs" for="new-eyebrow">Etiqueta</Label>
							<Input
								id="new-eyebrow"
								name="eyebrow"
								required
								placeholder="Cambios"
								class="w-40"
								bind:value={newEyebrow}
							/>
						</div>

						<div class="space-y-1.5">
							<Label class="text-xs" for="new-title">Título</Label>
							<Input
								id="new-title"
								name="title"
								required
								placeholder="Cambia sin problema"
								class="w-56"
								bind:value={newTitle}
							/>
						</div>

						<div class="min-w-64 flex-1 space-y-1.5">
							<Label class="text-xs" for="new-body">Texto</Label>
							<Input
								id="new-body"
								name="body"
								required
								placeholder="Tienes 8 días para cambiar tu producto."
								bind:value={newBody}
							/>
						</div>

						<div class="space-y-1.5">
							<Label class="text-xs" for="new-order">Orden</Label>
							<NumberField
								id="new-order"
								name="sortOrder"
								bind:value={newOrder}
								max={999}
								class="w-32"
							/>
						</div>

						<div class="pb-2">
							<CheckboxField
								id="nuevo-bloque-visible"
								name="active"
								label="Visible"
								bind:checked={newActive}
							/>
						</div>

						<Button type="submit" size="sm">Agregar</Button>
					</form>

					{#if rows.length > 0}
						<div class="space-y-4">
							{#each rows as highlight (highlight.id)}
								<EditableRowCard>
									<div class="grid gap-4 md:grid-cols-2">
										<div class="space-y-1.5">
											<Label for="eyebrow-{highlight.id}">Etiqueta</Label>
											<Input
												id="eyebrow-{highlight.id}"
												form="bloque-{highlight.id}"
												name="eyebrow"
												value={highlight.eyebrow}
												oninput={(event) =>
													editHighlight(highlight.id, { eyebrow: event.currentTarget.value })}
											/>
										</div>

										<div class="space-y-1.5">
											<Label for="title-{highlight.id}">Título</Label>
											<Input
												id="title-{highlight.id}"
												form="bloque-{highlight.id}"
												name="title"
												value={highlight.title}
												oninput={(event) =>
													editHighlight(highlight.id, { title: event.currentTarget.value })}
											/>
										</div>
									</div>

									<div class="space-y-1.5">
										<Label for="body-{highlight.id}">Texto</Label>
										<Textarea
											id="body-{highlight.id}"
											form="bloque-{highlight.id}"
											name="body"
											rows={2}
											maxlength={300}
											value={highlight.body}
											oninput={(event) =>
												editHighlight(highlight.id, { body: event.currentTarget.value })}
										/>
									</div>

									<div class="flex flex-wrap items-end gap-4">
										<div class="space-y-1.5">
											<Label for="order-{highlight.id}">Orden</Label>
											<NumberField
												id="order-{highlight.id}"
												form="bloque-{highlight.id}"
												name="sortOrder"
												value={highlight.sortOrder}
												max={999}
												class="w-32"
												onchange={(value) => editHighlight(highlight.id, { sortOrder: value })}
											/>
										</div>

										<div class="pb-2">
											<CheckboxField
												id="bloque-visible-{highlight.id}"
												form="bloque-{highlight.id}"
												name="active"
												label="Visible"
												checked={highlight.active}
												onchange={(checked) => editHighlight(highlight.id, { active: checked })}
											/>
										</div>
									</div>

									{#snippet acciones()}
										<Button type="submit" form="bloque-{highlight.id}" size="sm" variant="outline">
											Guardar
										</Button>

										<Button
											type="button"
											size="sm"
											variant="ghost"
											class="text-destructive"
											aria-label="Borrar mensaje"
											onclick={() =>
												borrado.ask(
													`borrar-bloque-${highlight.id}`,
													`¿Borrar el mensaje «${highlight.title}»?`,
													{ description: 'Se quita de la portada. No se puede deshacer.' }
												)}
										>
											<Trash2 class="size-3" />
											Borrar
										</Button>
									{/snippet}
								</EditableRowCard>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</LivePreviewLayout>

<ConfirmDeleteDialog
	bind:open={borrado.open}
	title={borrado.target?.title ?? ''}
	description={borrado.target?.description}
	form={borrado.target?.formId ?? ''}
	confirmLabel={borrado.target?.confirmLabel}
	pendingLabel={borrado.target?.pendingLabel}
	pending={borrado.pending}
/>

<!-- El HTML no admite <form> dentro de <tbody>: viven aquí y se referencian por id. -->
<div hidden>
	{#each data.highlights as highlight (highlight.id)}
		<form id="bloque-{highlight.id}" method="POST" action="?/actualizarBloque" use:enhance>
			<input type="hidden" name="id" value={highlight.id} />
		</form>

		<form
			id="borrar-bloque-{highlight.id}"
			method="POST"
			action="?/borrarBloque"
			use:enhance={alBorrar}
		>
			<input type="hidden" name="id" value={highlight.id} />
		</form>
	{/each}
</div>
