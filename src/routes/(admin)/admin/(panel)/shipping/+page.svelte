<script lang="ts">
	// Tipos
	import type { PageData } from './$types';

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
	import MoneyField from '$lib/components/molecules/MoneyField.svelte';
	import NumberField from '$lib/components/molecules/NumberField.svelte';
	import ConfirmDeleteDialog from '$lib/components/organisms/ConfirmDeleteDialog.svelte';
	import EditableRowCard from '$lib/components/organisms/EditableRowCard.svelte';
	import PreviewTemplate from '$lib/components/templates/PreviewTemplate.svelte';

	// Estado
	import { DeleteConfirm } from '$lib/utils/delete-confirm.svelte';
	import { FormState } from '$lib/utils/form-state.svelte';
	import { ShippingEditor } from './shipping-editor.svelte';

	// Utilidades
	import { formatMoney } from '$lib/utils/money';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const editor = new ShippingEditor(() => data);
	/** La fila que se guarda: al terminar, lo guardado ya trae sus cambios. */
	const update = new FormState();

	const deletion = new DeleteConfirm();
	const onDelete = deletion.enhance();
</script>

<svelte:head>
	<title>Envíos — Globerce</title>
</svelte:head>

<PreviewTemplate
	title="Zonas de envío"
	description="El cliente elige una en el carrito y su costo entra en el total del pedido."
	src={editor.src}
	draft={editor.draft}
	previewTitle="Así se ve tu envío"
>
	<Card.Root>
		<Card.Header>
			<Card.Title>Zonas</Card.Title>
			<Card.Description>{data.zones.length} configuradas</Card.Description>
		</Card.Header>

		<Card.Content class="space-y-4">
			<form
				method="POST"
				action="?/create"
				class="bg-muted/50 flex flex-wrap items-end gap-3 rounded-lg p-4"
				use:enhance={editor.create}
			>
				<div class="space-y-1.5">
					<Label class="text-xs" for="name">Nombre</Label>
					<Input
						id="name"
						name="name"
						required
						placeholder="Bogotá"
						class="w-56"
						bind:value={editor.newName}
					/>
				</div>

				<div class="space-y-1.5">
					<Label class="text-xs" for="cost">Costo</Label>
					<MoneyField id="cost" name="cost" bind:value={editor.newCost} class="w-40" />
				</div>

				<div class="space-y-1.5">
					<Label class="text-xs" for="etaDays">Días</Label>
					<NumberField
						id="etaDays"
						name="etaDays"
						bind:value={editor.newEtaDays}
						max={60}
						class="w-32"
					/>
				</div>

				<div class="pb-2">
					<CheckboxField
						id="nueva-zona"
						name="active"
						label="Disponible"
						bind:checked={editor.newActive}
					/>
				</div>

				<Button type="submit" size="sm" disabled={editor.createForm.pending}>Agregar zona</Button>
			</form>

			<div class="space-y-4">
				{#each editor.rows as zone (zone.id)}
					<EditableRowCard>
						<div class="grid gap-4 md:grid-cols-2">
							<div class="space-y-1.5">
								<Label for="nombre-{zone.id}">Zona</Label>
								<Input
									id="nombre-{zone.id}"
									form="zone-{zone.id}"
									name="name"
									value={zone.name}
									oninput={(event) => editor.edit(zone.id, { name: event.currentTarget.value })}
								/>
							</div>

							<div class="space-y-1.5">
								<Label for="costo-{zone.id}">Costo</Label>
								<MoneyField
									id="costo-{zone.id}"
									form="zone-{zone.id}"
									name="cost"
									value={zone.cost}
									onchange={(value) => editor.edit(zone.id, { cost: value })}
								/>
							</div>
						</div>

						<div class="flex flex-wrap items-end gap-4">
							<div class="space-y-1.5">
								<Label for="dias-{zone.id}">Días</Label>
								<NumberField
									id="dias-{zone.id}"
									form="zone-{zone.id}"
									name="etaDays"
									value={zone.etaDays ?? 0}
									onchange={(value) => editor.edit(zone.id, { etaDays: value })}
									max={60}
									class="w-32"
								/>
							</div>

							<div class="pb-2">
								<CheckboxField
									id="zone-active-{zone.id}"
									form="zone-{zone.id}"
									name="active"
									label="Disponible"
									checked={zone.active}
									onchange={(checked) => editor.edit(zone.id, { active: checked })}
								/>
							</div>

							<p class="text-muted-foreground pb-2 text-xs">
								En la tienda: {zone.cost === 0 ? 'Gratis' : formatMoney(zone.cost ?? 0)}
								{zone.etaDays ? ` · ${zone.etaDays} días` : ''}
							</p>
						</div>

						{#snippet actionList()}
							<Button type="submit" form="zone-{zone.id}" size="sm" variant="outline">
								Guardar
							</Button>

							<Button
								type="button"
								onclick={() =>
									deletion.ask(`delete-zone-${zone.id}`, `¿Borrar ${zone.name}?`, {
										description: 'Si ya se usó en pedidos, se desactiva en vez de borrarse.'
									})}
								size="sm"
								variant="ghost"
								class="text-destructive"
								aria-label="Borrar {zone.name}"
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
</PreviewTemplate>

<!-- El HTML no admite <form> dentro de <tbody>: viven aquí y se referencian por id. -->
<div hidden>
	{#each data.zones as zone (zone.id)}
		<form
			id="zone-{zone.id}"
			method="POST"
			action="?/update"
			use:enhance={update.submit({ onSuccess: () => editor.forget(zone.id) })}
		>
			<input type="hidden" name="id" value={zone.id} />
			<input type="hidden" name="sortOrder" value={zone.sort_order} />
		</form>

		<form id="delete-zone-{zone.id}" method="POST" action="?/delete" use:enhance={onDelete}>
			<input type="hidden" name="id" value={zone.id} />
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
