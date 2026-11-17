<script lang="ts">
	// Tipos
	import type { StorefrontDraft } from '$lib/domain/preview';
	import type { PageData } from './$types';

	// Iconos
	import Trash2 from '@lucide/svelte/icons/trash-2';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { Badge } from '$lib/components/atoms/badge';
	import { Button } from '$lib/components/atoms/button';
	import { Input } from '$lib/components/atoms/input';
	import { Label } from '$lib/components/atoms/label';
	import * as Table from '$lib/components/atoms/table';
	import CheckboxField from '$lib/components/molecules/CheckboxField.svelte';
	import MoneyField from '$lib/components/molecules/MoneyField.svelte';
	import SelectField from '$lib/components/molecules/SelectField.svelte';
	import ConfirmDeleteDialog from '$lib/components/organisms/ConfirmDeleteDialog.svelte';
	import LivePreviewLayout from '$lib/components/organisms/LivePreviewLayout.svelte';

	// Estado
	import { DeleteConfirm } from '$lib/utils/delete-confirm.svelte';

	// Utilidades
	import { themePreviewUrl } from '$lib/template-preview';
	import { formatMoney } from '$lib/utils/money';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let type = $state<'percent' | 'fixed'>('percent');

	// Copia editable del cupón que se está creando, para la vista previa.
	let code = $state('');
	let value = $state<number | null>(null);
	let minSubtotal = $state<number | null>(0);
	let active = $state(true);

	const draft = $derived<StorefrontDraft>({
		template: data.settings.template,
		theme: data.settings.theme,
		content: {
			kind: 'coupon',
			code,
			type,
			value: typeof value === 'number' && Number.isFinite(value) ? value : 0,
			minSubtotal:
				typeof minSubtotal === 'number' && Number.isFinite(minSubtotal) ? minSubtotal : 0,
			active
		},
		focus: 'cart-coupon'
	});

	const previewSrc = $derived(
		themePreviewUrl(
			new URL('/preview/cart', data.previewUrl).toString(),
			data.settings.template,
			data.settings.theme
		)
	);

	const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });
	const borrado = new DeleteConfirm();
	const alBorrar = borrado.enhance();
</script>

<svelte:head>
	<title>Cupones — Globerce</title>
</svelte:head>

<header class="mb-6">
	<h1 class="text-3xl">Cupones</h1>
	<p class="text-muted-foreground text-sm">
		El código se valida en el carrito y el descuento lo recalcula el servidor.
	</p>
</header>

<LivePreviewLayout src={previewSrc} {draft} title="Así se ve tu cupón">
	<section class="border-border bg-card rounded-lg mb-8 border p-6">
		<h2 class="mb-4 text-lg">Nuevo cupón</h2>

		<form
			method="POST"
			action="?/create"
			class="grid gap-4 sm:grid-cols-3"
			use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') {
						code = '';
						type = 'percent';
						value = null;
						minSubtotal = 0;
						active = true;
					}
				};
			}}
		>
			<div class="space-y-2">
				<Label for="code">Código</Label>
				<Input
					id="code"
					name="code"
					required
					placeholder="BIENVENIDA10"
					class="uppercase"
					bind:value={code}
				/>
			</div>

			<div class="space-y-2">
				<Label for="type">Tipo</Label>
				<SelectField
					id="type"
					name="type"
					bind:value={type}
					options={[
						{ value: 'percent', label: 'Porcentaje' },
						{ value: 'fixed', label: 'Monto fijo' }
					]}
				/>
			</div>

			<div class="space-y-2">
				<Label for="value">{type === 'percent' ? 'Porcentaje (1-100)' : 'Monto en pesos'}</Label>
				{#if type === 'percent'}
					<Input id="value" name="value" type="number" min="1" max={100} required bind:value />
				{:else}
					<MoneyField id="value" name="value" required bind:value />
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="minSubtotal">Mínimo de compra</Label>
				<MoneyField id="minSubtotal" name="minSubtotal" bind:value={minSubtotal} />
			</div>

			<div class="space-y-2">
				<Label for="maxUses">Usos máximos</Label>
				<Input id="maxUses" name="maxUses" type="number" min="1" placeholder="Sin límite" />
			</div>

			<div class="space-y-2">
				<Label for="endsAt">Vence el</Label>
				<Input id="endsAt" name="endsAt" type="date" />
			</div>

			<div class="sm:col-span-3">
				<CheckboxField id="active" name="active" label="Activo desde ya" bind:checked={active} />
			</div>

			<div class="sm:col-span-3">
				<Button type="submit">Crear cupón</Button>
			</div>
		</form>
	</section>

	{#if data.coupons.length === 0}
		<p
			class="text-muted-foreground border-border border border-dashed px-6 py-16 text-center text-sm"
		>
			Todavía no hay cupones.
		</p>
	{:else}
		<div class="border-border bg-card overflow-hidden rounded-lg border">
			<Table.Root class="table-stack">
				<Table.Header>
					<Table.Row>
						<Table.Head>Código</Table.Head>
						<Table.Head>Descuento</Table.Head>
						<Table.Head>Mínimo</Table.Head>
						<Table.Head>Usos</Table.Head>
						<Table.Head>Vence</Table.Head>
						<Table.Head></Table.Head>
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{#each data.coupons as coupon (coupon.id)}
						<Table.Row>
							<Table.Cell data-label="Código">
								<span class="font-medium">{coupon.code}</span>
								{#if !coupon.active}
									<Badge variant="outline" class="ml-2">Inactivo</Badge>
								{/if}
							</Table.Cell>

							<Table.Cell data-label="Descuento">
								{coupon.type === 'percent' ? `${coupon.value}%` : formatMoney(coupon.value)}
							</Table.Cell>

							<Table.Cell data-label="Mínimo" class="tabular-nums">
								{coupon.min_subtotal > 0 ? formatMoney(coupon.min_subtotal) : '—'}
							</Table.Cell>

							<Table.Cell data-label="Usos" class="tabular-nums">
								{coupon.uses}{coupon.max_uses ? ` / ${coupon.max_uses}` : ''}
							</Table.Cell>

							<Table.Cell data-label="Vence" class="text-muted-foreground text-sm">
								{coupon.ends_at ? dateFormatter.format(new Date(coupon.ends_at)) : '—'}
							</Table.Cell>

							<Table.Cell data-label="" class="text-right">
								<div class="flex justify-end gap-1">
									<form method="POST" action="?/toggle" use:enhance>
										<input type="hidden" name="id" value={coupon.id} />
										<input type="hidden" name="active" value={String(!coupon.active)} />
										<Button type="submit" size="sm" variant="ghost">
											{coupon.active ? 'Desactivar' : 'Activar'}
										</Button>
									</form>

									<form
										id="borrar-cupon-{coupon.id}"
										method="POST"
										action="?/delete"
										use:enhance={alBorrar}
									>
										<input type="hidden" name="id" value={coupon.id} />
										<Button
											type="button"
											size="sm"
											variant="ghost"
											class="text-destructive"
											aria-label="Borrar cupón {coupon.code}"
											onclick={() =>
												borrado.ask(
													`borrar-cupon-${coupon.id}`,
													`¿Borrar el cupón ${coupon.code}?`,
													{ description: 'Si ya se usó, se desactiva en vez de borrarse.' }
												)}
										>
											<Trash2 class="size-3" />
										</Button>
									</form>
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{/if}
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
