<script lang="ts">
	// Tipos
	import type { PageData } from './$types';

	// Iconos
	import Trash2 from '@lucide/svelte/icons/trash-2';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { Badge } from '$lib/components/atoms/badge';
	import { Button } from '$lib/components/atoms/button';
	import { Input } from '$lib/components/atoms/input';
	import * as Table from '$lib/components/atoms/table';
	import CheckboxField from '$lib/components/molecules/CheckboxField.svelte';
	import FormField from '$lib/components/molecules/FormField.svelte';
	import MoneyField from '$lib/components/molecules/MoneyField.svelte';
	import SelectField from '$lib/components/molecules/SelectField.svelte';
	import ConfirmDeleteDialog from '$lib/components/organisms/ConfirmDeleteDialog.svelte';
	import FormSection from '$lib/components/organisms/FormSection.svelte';
	import LivePreviewLayout from '$lib/components/organisms/LivePreviewLayout.svelte';

	// Estado
	import { DeleteConfirm } from '$lib/utils/delete-confirm.svelte';
	import { CouponDraft } from './coupon-draft.svelte';

	// Utilidades
	import { formatMoney } from '$lib/utils/money';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const newCoupon = new CouponDraft(() => data);

	const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });
	const deletion = new DeleteConfirm();
	const onDelete = deletion.enhance();
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

<LivePreviewLayout src={newCoupon.src} draft={newCoupon.draft} title="Así se ve tu cupón">
	<FormSection title="Nuevo cupón" class="mb-8">
		<form
			method="POST"
			action="?/create"
			class="grid gap-4 sm:grid-cols-3"
			use:enhance={newCoupon.create}
		>
			<FormField name="code" label="Código">
				{#snippet children(field)}
					<Input
						{...field}
						required
						placeholder="BIENVENIDA10"
						class="uppercase"
						bind:value={newCoupon.code}
					/>
				{/snippet}
			</FormField>

			<FormField name="type" label="Tipo">
				{#snippet children(field)}
					<SelectField
						id={field.id}
						name={field.name}
						bind:value={newCoupon.type}
						options={[
							{ value: 'percent', label: 'Porcentaje' },
							{ value: 'fixed', label: 'Monto fijo' }
						]}
					/>
				{/snippet}
			</FormField>

			<FormField
				name="value"
				label={newCoupon.type === 'percent' ? 'Porcentaje (1-100)' : 'Monto en pesos'}
			>
				{#snippet children(field)}
					{#if newCoupon.type === 'percent'}
						<Input
							{...field}
							type="number"
							min="1"
							max={100}
							required
							bind:value={newCoupon.value}
						/>
					{:else}
						<MoneyField id={field.id} name={field.name} required bind:value={newCoupon.value} />
					{/if}
				{/snippet}
			</FormField>

			<FormField name="minSubtotal" label="Mínimo de compra">
				{#snippet children(field)}
					<MoneyField id={field.id} name={field.name} bind:value={newCoupon.minSubtotal} />
				{/snippet}
			</FormField>

			<FormField name="maxUses" label="Usos máximos">
				{#snippet children(field)}
					<Input {...field} type="number" min="1" placeholder="Sin límite" />
				{/snippet}
			</FormField>

			<FormField name="endsAt" label="Vence el">
				{#snippet children(field)}
					<Input {...field} type="date" />
				{/snippet}
			</FormField>

			<div class="sm:col-span-3">
				<CheckboxField
					id="active"
					name="active"
					label="Activo desde ya"
					bind:checked={newCoupon.active}
				/>
			</div>

			<div class="sm:col-span-3">
				<Button type="submit" disabled={newCoupon.createForm.pending}>
					{newCoupon.createForm.pending ? 'Creando…' : 'Crear cupón'}
				</Button>
			</div>
		</form>
	</FormSection>

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
										use:enhance={onDelete}
									>
										<input type="hidden" name="id" value={coupon.id} />
										<Button
											type="button"
											size="sm"
											variant="ghost"
											class="text-destructive"
											aria-label="Borrar cupón {coupon.code}"
											onclick={() =>
												deletion.ask(
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
	bind:open={deletion.open}
	title={deletion.target?.title ?? ''}
	description={deletion.target?.description}
	form={deletion.target?.formId ?? ''}
	confirmLabel={deletion.target?.confirmLabel}
	pendingLabel={deletion.target?.pendingLabel}
	pending={deletion.pending}
/>
