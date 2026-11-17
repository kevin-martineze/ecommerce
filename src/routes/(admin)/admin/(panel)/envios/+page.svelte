<script lang="ts">
	import ConfirmDeleteDialog from '$lib/components/molecules/ConfirmDeleteDialog.svelte';
	import { DeleteConfirm } from '$lib/utils/delete-confirm.svelte';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	import { enhance } from '$app/forms';

	import type { PageData } from './$types';
	import type { StorefrontDraft } from '$lib/domain/preview';
	import { Button } from '$lib/components/atoms/button';
	import * as Card from '$lib/components/atoms/card';
	import { Input } from '$lib/components/atoms/input';
	import { Label } from '$lib/components/atoms/label';
	import CheckboxField from '$lib/components/molecules/CheckboxField.svelte';
	import MoneyField from '$lib/components/molecules/MoneyField.svelte';
	import NumberField from '$lib/components/molecules/NumberField.svelte';
	import EditableRowCard from '$lib/components/organisms/EditableRowCard.svelte';
	import LivePreviewLayout from '$lib/components/organisms/LivePreviewLayout.svelte';
	import { themePreviewUrl } from '$lib/template-preview';
	import { formatMoney } from '$lib/utils/money';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	interface ZoneEdit {
		name?: string;
		cost?: number | null;
		etaDays?: number;
		active?: boolean;
	}

	/**
	 * Los cambios de cada fila viven aquí, por id. Así la lista sigue pintando
	 * lo guardado y el borrador se arma con lo que la dueña escribe encima.
	 */
	let zoneEdits = $state<Record<string, ZoneEdit>>({});

	// La zona que se está creando también se ve, sin esperar a guardarla.
	let newName = $state('');
	let newCost = $state<number | null>(0);
	let newEtaDays = $state(2);
	let newActive = $state(true);

	/** El costo que la dueña escribió en la fila, o el guardado si no lo tocó. */
	function costoDe(id: string, guardado: number): number | null {
		const editado = zoneEdits[id]?.cost;

		return editado === undefined ? guardado : editado;
	}

	const rows = $derived(
		data.zones.map((zone) => ({
			id: zone.id,
			name: zoneEdits[zone.id]?.name ?? zone.name,
			cost: costoDe(zone.id, zone.cost),
			etaDays: zoneEdits[zone.id]?.etaDays ?? zone.eta_days,
			active: zoneEdits[zone.id]?.active ?? zone.active,
			sortOrder: zone.sort_order
		}))
	);

	const draftZones = $derived([
		...rows.map((zone) => ({
			id: zone.id,
			name: zone.name,
			// Un campo vacío llega como null: el borrador lo pinta en cero.
			cost: zone.cost ?? 0,
			etaDays: zone.etaDays,
			active: zone.active
		})),
		...(newName.trim()
			? [
					{
						id: 'nueva',
						name: newName,
						cost: newCost ?? 0,
						etaDays: Number.isFinite(newEtaDays) ? newEtaDays : null,
						active: newActive
					}
				]
			: [])
	]);

	const draft = $derived<StorefrontDraft>({
		template: data.settings.template,
		theme: data.settings.theme,
		content: { kind: 'shipping', zones: draftZones },
		focus: 'prodhipping'
	});

	const previewSrc = $derived(
		themePreviewUrl(
			new URL('/vista-previa/carrito', data.previewUrl).toString(),
			data.settings.template,
			data.settings.theme
		)
	);

	function editZone(id: string, patch: ZoneEdit) {
		zoneEdits[id] = { ...zoneEdits[id], ...patch };
	}
	const borrado = new DeleteConfirm();
	const alBorrar = borrado.enhance();
</script>

<svelte:head>
	<title>Envíos — Globerce</title>
</svelte:head>

<header class="mb-6 space-y-1">
	<h1 class="text-3xl">Zonas de envío</h1>
	<p class="text-muted-foreground text-sm">
		El cliente elige una en el carrito y su costo entra en el total del pedido.
	</p>
</header>

<LivePreviewLayout src={previewSrc} {draft} title="Así se ve tu envío">
	<Card.Root>
		<Card.Header>
			<Card.Title>Zonas</Card.Title>
			<Card.Description>{data.zones.length} configuradas</Card.Description>
		</Card.Header>

		<Card.Content class="space-y-4">
			<form
				method="POST"
				action="?/crear"
				class="bg-muted/50 flex flex-wrap items-end gap-3 rounded-lg p-4"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							newName = '';
							newCost = 0;
							newEtaDays = 2;
							newActive = true;
						}
					};
				}}
			>
				<div class="space-y-1.5">
					<Label class="text-xs" for="name">Nombre</Label>
					<Input
						id="name"
						name="name"
						required
						placeholder="Bogotá"
						class="w-56"
						bind:value={newName}
					/>
				</div>

				<div class="space-y-1.5">
					<Label class="text-xs" for="cost">Costo</Label>
					<MoneyField id="cost" name="cost" bind:value={newCost} class="w-40" />
				</div>

				<div class="space-y-1.5">
					<Label class="text-xs" for="etaDays">Días</Label>
					<NumberField id="etaDays" name="etaDays" bind:value={newEtaDays} max={60} class="w-32" />
				</div>

				<div class="pb-2">
					<CheckboxField
						id="nueva-zona"
						name="active"
						label="Disponible"
						bind:checked={newActive}
					/>
				</div>

				<Button type="submit" size="sm">Agregar zona</Button>
			</form>

			<div class="space-y-4">
				{#each rows as zone (zone.id)}
					<EditableRowCard>
						<div class="grid gap-4 md:grid-cols-2">
							<div class="space-y-1.5">
								<Label for="nombre-{zone.id}">Zona</Label>
								<Input
									id="nombre-{zone.id}"
									form="zona-{zone.id}"
									name="name"
									value={zone.name}
									oninput={(event) => editZone(zone.id, { name: event.currentTarget.value })}
								/>
							</div>

							<div class="space-y-1.5">
								<Label for="costo-{zone.id}">Costo</Label>
								<MoneyField
									id="costo-{zone.id}"
									form="zona-{zone.id}"
									name="cost"
									value={zone.cost}
									onchange={(value) => editZone(zone.id, { cost: value })}
								/>
							</div>
						</div>

						<div class="flex flex-wrap items-end gap-4">
							<div class="space-y-1.5">
								<Label for="dias-{zone.id}">Días</Label>
								<NumberField
									id="dias-{zone.id}"
									form="zona-{zone.id}"
									name="etaDays"
									value={zone.etaDays ?? 0}
									onchange={(value) => editZone(zone.id, { etaDays: value })}
									max={60}
									class="w-32"
								/>
							</div>

							<div class="pb-2">
								<CheckboxField
									id="zona-activa-{zone.id}"
									form="zona-{zone.id}"
									name="active"
									label="Disponible"
									checked={zone.active}
									onchange={(checked) => editZone(zone.id, { active: checked })}
								/>
							</div>

							<p class="text-muted-foreground pb-2 text-xs">
								En la tienda: {zone.cost === 0 ? 'Gratis' : formatMoney(zone.cost ?? 0)}
								{zone.etaDays ? ` · ${zone.etaDays} días` : ''}
							</p>
						</div>

						{#snippet acciones()}
							<Button type="submit" form="zona-{zone.id}" size="sm" variant="outline">
								Guardar
							</Button>

							<Button
								type="button"
								onclick={() =>
									borrado.ask(`borrar-zona-${zone.id}`, `¿Borrar ${zone.name}?`, {
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
</LivePreviewLayout>

<!-- El HTML no admite <form> dentro de <tbody>: viven aquí y se referencian por id. -->
<div hidden>
	{#each data.zones as zone (zone.id)}
		<form
			id="zona-{zone.id}"
			method="POST"
			action="?/actualizar"
			use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') {
						delete zoneEdits[zone.id];
					}
				};
			}}
		>
			<input type="hidden" name="id" value={zone.id} />
			<input type="hidden" name="sortOrder" value={zone.sort_order} />
		</form>

		<form id="borrar-zona-{zone.id}" method="POST" action="?/eliminar" use:enhance={alBorrar}>
			<input type="hidden" name="id" value={zone.id} />
		</form>
	{/each}
</div>

<ConfirmDeleteDialog
	bind:open={borrado.open}
	title={borrado.target?.title ?? ''}
	description={borrado.target?.description}
	form={borrado.target?.formId ?? ''}
	confirmLabel={borrado.target?.confirmLabel}
	pendingLabel={borrado.target?.pendingLabel}
	pending={borrado.pending}
/>
