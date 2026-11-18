<!--
@component
Sección Portada: la imagen de arriba y los mensajes de abajo.
-->
<script lang="ts">
	// Tipos
	import type { DeleteConfirm } from '$lib/utils/delete-confirm.svelte';
	import type { DesignEditor } from './design-editor.svelte';

	// Iconos
	import Trash2 from '@lucide/svelte/icons/trash-2';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { Badge } from '$lib/components/atoms/badge';
	import { Button } from '$lib/components/atoms/button';
	import { Input } from '$lib/components/atoms/input';
	import { Label } from '$lib/components/atoms/label';
	import { Textarea } from '$lib/components/atoms/textarea';
	import CheckboxField from '$lib/components/molecules/CheckboxField.svelte';
	import NumberField from '$lib/components/molecules/NumberField.svelte';
	import SelectField from '$lib/components/molecules/SelectField.svelte';
	import EditableRowCard from '$lib/components/organisms/EditableRowCard.svelte';

	interface Props {
		editor: DesignEditor;
		deletion: DeleteConfirm;
	}

	let { editor, deletion }: Props = $props();
</script>

<div class="space-y-6 p-5">
	<div class="space-y-3">
		<h2 class="text-sm font-semibold">Imagen de arriba</h2>
		<p class="text-muted-foreground text-xs">
			Elige una colección para que su foto y su nombre encabecen la tienda. Si no eliges ninguna, se
			usan el título y el texto que escribas aquí.
		</p>

		<div class="space-y-2">
			<Label for="heroCollectionId">Colección destacada</Label>
			<SelectField
				id="heroCollectionId"
				name="heroCollectionId"
				bind:value={editor.values.heroCollectionId}
				placeholder="Ninguna: usar mi propio título"
				options={editor.collectionOptions}
			/>

			{#if editor.chosenCollection}
				<div class="flex items-center gap-3 pt-1">
					{#if editor.chosenCollection.hero_image_url}
						<img
							src={editor.chosenCollection.hero_image_url}
							alt=""
							class="bg-muted h-16 w-24 object-cover"
						/>
					{/if}
					<p class="text-muted-foreground text-xs">
						Se muestran la foto, el nombre y la descripción de esta colección.
						{#if !editor.chosenCollection.active}
							<Badge variant="outline" class="ml-2">Está oculta en la tienda</Badge>
						{/if}
					</p>
				</div>
			{/if}
		</div>

		<div class="space-y-2">
			<Label for="heroTitle">Título propio</Label>
			<Input
				id="heroTitle"
				bind:value={editor.values.heroTitle}
				maxlength={120}
				placeholder="Productos que duran más de una temporada"
				disabled={editor.chosenCollection !== null}
			/>
		</div>

		<div class="space-y-2">
			<Label for="heroSubtitle">Texto de apoyo</Label>
			<Textarea
				id="heroSubtitle"
				rows={2}
				maxlength={300}
				bind:value={editor.values.heroSubtitle}
				placeholder="Selección corta, materiales nobles y variaciones reales."
				disabled={editor.chosenCollection !== null}
			/>
		</div>
	</div>

	<div
		class="border-border space-y-4 border-t pt-5"
		id="bottom-messages"
		role="group"
		aria-label="Mensajes de abajo"
		onfocusin={() => (editor.inMessages = true)}
	>
		<div class="flex items-center justify-between gap-2">
			<h2 class="text-sm font-semibold">Mensajes de abajo</h2>
			<Badge variant="outline">Se guarda al instante</Badge>
		</div>
		<p class="text-muted-foreground text-xs">
			{editor.highlights.rows.length} bloques · se muestran en el orden que definas
		</p>

		<form
			method="POST"
			action="?/createBlock"
			class="bg-muted/50 grid gap-3 rounded-lg p-4"
			use:enhance={editor.highlights.create}
		>
			<div class="grid grid-cols-2 gap-3">
				<div class="space-y-1.5">
					<Label class="text-xs" for="new-eyebrow">Etiqueta</Label>
					<Input
						id="new-eyebrow"
						name="eyebrow"
						required
						placeholder="Cambios"
						bind:value={editor.highlights.newEyebrow}
					/>
				</div>
				<div class="space-y-1.5">
					<Label class="text-xs" for="new-title">Título</Label>
					<Input
						id="new-title"
						name="title"
						required
						placeholder="Cambia sin problema"
						bind:value={editor.highlights.newTitle}
					/>
				</div>
			</div>

			<div class="space-y-1.5">
				<Label class="text-xs" for="new-body">Texto</Label>
				<Textarea
					id="new-body"
					name="body"
					required
					rows={2}
					maxlength={300}
					placeholder="Tienes 8 días para cambiar tu producto."
					bind:value={editor.highlights.newBody}
				/>
			</div>

			<div class="flex flex-wrap items-end gap-4">
				<div class="space-y-1.5">
					<Label class="text-xs" for="new-order">Orden</Label>
					<NumberField
						id="new-order"
						name="sortOrder"
						bind:value={editor.highlights.newOrder}
						max={999}
						class="w-32"
					/>
				</div>
				<div class="pb-2">
					<CheckboxField
						id="new-highlight-active"
						name="active"
						label="Visible"
						bind:checked={editor.highlights.newActive}
					/>
				</div>
				<Button
					type="submit"
					size="sm"
					class="ml-auto"
					disabled={editor.highlights.createForm.pending}
				>
					Agregar mensaje
				</Button>
			</div>
		</form>

		{#if editor.highlights.rows.length > 0}
			<div class="space-y-4">
				{#each editor.highlights.rows as highlight (highlight.id)}
					<EditableRowCard>
						<div class="grid gap-4">
							<div class="grid grid-cols-2 gap-3">
								<div class="space-y-1.5">
									<Label for="eyebrow-{highlight.id}">Etiqueta</Label>
									<Input
										id="eyebrow-{highlight.id}"
										form="highlight-{highlight.id}"
										name="eyebrow"
										value={highlight.eyebrow}
										oninput={(event) =>
											editor.highlights.edit(highlight.id, { eyebrow: event.currentTarget.value })}
									/>
								</div>
								<div class="space-y-1.5">
									<Label for="title-{highlight.id}">Título</Label>
									<Input
										id="title-{highlight.id}"
										form="highlight-{highlight.id}"
										name="title"
										value={highlight.title}
										oninput={(event) =>
											editor.highlights.edit(highlight.id, { title: event.currentTarget.value })}
									/>
								</div>
							</div>

							<div class="space-y-1.5">
								<Label for="body-{highlight.id}">Texto</Label>
								<Textarea
									id="body-{highlight.id}"
									form="highlight-{highlight.id}"
									name="body"
									rows={2}
									maxlength={300}
									value={highlight.body}
									oninput={(event) =>
										editor.highlights.edit(highlight.id, { body: event.currentTarget.value })}
								/>
							</div>

							<div class="flex flex-wrap items-end gap-4">
								<div class="space-y-1.5">
									<Label for="order-{highlight.id}">Orden</Label>
									<NumberField
										id="order-{highlight.id}"
										form="highlight-{highlight.id}"
										name="sortOrder"
										value={highlight.sortOrder}
										max={999}
										class="w-32"
										onchange={(value) => editor.highlights.edit(highlight.id, { sortOrder: value })}
									/>
								</div>
								<div class="pb-2">
									<CheckboxField
										id="highlight-active-{highlight.id}"
										form="highlight-{highlight.id}"
										name="active"
										label="Visible"
										checked={highlight.active}
										onchange={(checked) =>
											editor.highlights.edit(highlight.id, { active: checked })}
									/>
								</div>
							</div>
						</div>

						{#snippet actionList()}
							<Button type="submit" form="highlight-{highlight.id}" size="sm" variant="outline">
								Guardar
							</Button>

							<Button
								type="button"
								size="sm"
								variant="ghost"
								class="text-destructive"
								aria-label="Borrar mensaje"
								onclick={() =>
									deletion.ask(
										`delete-highlight-${highlight.id}`,
										`¿Borrar el mensaje «${highlight.title}»?`,
										{
											description: 'Se quita de la portada. No se puede deshacer.'
										}
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
	</div>
</div>
