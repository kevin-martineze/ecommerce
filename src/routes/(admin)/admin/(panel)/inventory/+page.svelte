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
	import * as Table from '$lib/components/atoms/table';
	import NumberField from '$lib/components/molecules/NumberField.svelte';
	import ConfirmDeleteDialog from '$lib/components/organisms/ConfirmDeleteDialog.svelte';

	// Estado
	import { DeleteConfirm } from '$lib/utils/delete-confirm.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const borrado = new DeleteConfirm();
	const alBorrar = borrado.enhance();
</script>

<svelte:head>
	<title>Inventario — Globerce</title>
</svelte:head>

<header class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<div>
		<h1 class="text-3xl">Inventario</h1>
		<p class="text-muted-foreground text-sm">
			Edita el stock de cada variación. Los pedidos lo descuentan solos.
		</p>
	</div>

	<div class="flex gap-2">
		<Button href="/admin/inventory" variant={data.onlyLow ? 'outline' : 'default'} size="sm">
			Todo
		</Button>
		<Button href="/admin/inventory?bajo=1" variant={data.onlyLow ? 'default' : 'outline'} size="sm">
			Stock bajo
		</Button>
	</div>
</header>

{#if data.groups.length === 0}
	<Card.Root>
		<Card.Content class="text-muted-foreground py-16 text-center text-sm">
			{data.onlyLow ? 'Nada con stock bajo.' : 'Todavía no hay variantes creadas.'}
		</Card.Content>
	</Card.Root>
{:else}
	<div class="space-y-6">
		{#each data.groups as group (group.id)}
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between gap-3">
						<Card.Title>
							<a href="/admin/products/{group.id}" class="hover:underline">{group.name}</a>
						</Card.Title>
						<Card.Description>
							{group.rows.reduce((sum, row) => sum + row.stock, 0)} unidades
						</Card.Description>
					</div>
				</Card.Header>

				<Card.Content>
					<Table.Root class="table-stack">
						<Table.Header>
							<Table.Row>
								<Table.Head class="w-10"></Table.Head>
								<Table.Head>Variación</Table.Head>
								<Table.Head>Referencia</Table.Head>
								<Table.Head class="w-44">Stock</Table.Head>
								<Table.Head class="w-56"></Table.Head>
							</Table.Row>
						</Table.Header>

						<Table.Body>
							{#each group.rows as row (row.id)}
								<Table.Row>
									<Table.Cell data-label="">
										<span
											class="border-border block size-3.5 rounded-full border"
											style="background-color: {row.hex ?? 'transparent'}"
											title={row.label ?? ''}
										></span>
									</Table.Cell>

									<Table.Cell data-label="Variación" class="text-sm font-medium">
										{row.label ?? '—'}
										{#if !row.active}
											<span class="text-muted-foreground text-xs font-normal">· inactiva</span>
										{/if}
									</Table.Cell>

									<Table.Cell
										data-label="Referencia"
										class="text-muted-foreground font-mono text-xs"
									>
										{row.sku ?? ''}
									</Table.Cell>

									<Table.Cell data-label="Stock">
										<NumberField
											form="stock-{row.id}"
											name="stock"
											value={row.stock}
											invalid={row.stock === 0}
											aria-label="Stock de {row.label ?? 'esta variación'}"
										/>
									</Table.Cell>

									<Table.Cell data-label="">
										<div class="flex items-center justify-end gap-1">
											<Button type="submit" form="stock-{row.id}" size="sm" variant="outline">
												Guardar
											</Button>
											<Button href="/admin/products/{group.id}" size="sm" variant="ghost">
												Editar
											</Button>
											<Button
												type="button"
												size="icon"
												variant="ghost"
												class="text-destructive"
												aria-label="Borrar {row.label ?? 'esta variación'}"
												onclick={() =>
													borrado.ask(
														`borrar-${row.id}`,
														`¿Borrar ${row.label ?? 'esta variación'}?`,
														{
															description:
																'Si ya salió en pedidos no se borra: se desactiva, para conservar el historial.'
														}
													)}
											>
												<Trash2 class="size-4" />
											</Button>
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
{/if}

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
	{#each data.groups as group (group.id)}
		{#each group.rows as row (row.id)}
			<form id="stock-{row.id}" method="POST" action="?/stock" use:enhance>
				<input type="hidden" name="variantId" value={row.id} />
			</form>

			<form id="borrar-{row.id}" method="POST" action="?/delete" use:enhance={alBorrar}>
				<input type="hidden" name="variantId" value={row.id} />
			</form>
		{/each}
	{/each}
</div>
