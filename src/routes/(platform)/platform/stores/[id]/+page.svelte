<script lang="ts">
	// Tipos
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { PageData } from './$types';

	// Svelte
	import { untrack } from 'svelte';

	// Librerías
	import { toast } from 'svelte-sonner';

	// Iconos
	import ExternalLink from '@lucide/svelte/icons/external-link';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import { Input } from '$lib/components/atoms/input';
	import { Label } from '$lib/components/atoms/label';
	import * as Table from '$lib/components/atoms/table';
	import { Textarea } from '$lib/components/atoms/textarea';
	import MoneyField from '$lib/components/molecules/MoneyField.svelte';
	import SelectField from '$lib/components/molecules/SelectField.svelte';
	import StoreStatusBadge from '$lib/components/molecules/StoreStatusBadge.svelte';
	import TypedConfirmDialog from '$lib/components/molecules/TypedConfirmDialog.svelte';
	import ConfirmDeleteDialog from '$lib/components/organisms/ConfirmDeleteDialog.svelte';
	import PageTemplate from '$lib/components/templates/PageTemplate.svelte';

	// Estado
	import { DeleteConfirm } from '$lib/utils/delete-confirm.svelte';

	// Dominio
	import { MEMBER_ROLE_LABEL } from '$lib/domain/account';
	import { DOMAIN_STATUS_LABEL } from '$lib/domain/domain';

	// Utilidades
	import { formatMoney } from '$lib/utils/money';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const store = $derived(data.store);

	const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' });

	function formatDate(value: string | null): string {
		return value ? dateFormatter.format(new Date(`${value.slice(0, 10)}T00:00:00Z`)) : '—';
	}

	function isoDate(date: Date): string {
		return date.toISOString().slice(0, 10);
	}

	/** El pago nuevo sugiere el mes que sigue al período vigente (o a hoy, si ya venció). */
	function suggestedPeriod(currentEnd: string | null): { start: string; end: string } {
		const today = Date.now();
		const base = currentEnd ? Date.parse(`${currentEnd}T00:00:00Z`) + 86_400_000 : today;
		const start = new Date(Math.max(base, today));
		const end = new Date(
			Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate() - 1)
		);

		return { start: isoDate(start), end: isoDate(end) };
	}

	const period = $derived(suggestedPeriod(store.current_period_end));
	const currentPlan = $derived(data.plans.find((plan) => plan.code === store.plan_code));

	let planCode = $state(untrack(() => data.store.plan_code ?? ''));
	const deletion = new DeleteConfirm();
	const onDelete = deletion.enhance();

	let removeOpen = $state(false);
	let removing = $state(false);

	/** Al eliminar, la acción redirige al listado: el aviso va aquí porque no queda `form`. */
	const onRemove: SubmitFunction = () => {
		removing = true;

		return async ({ result, update }) => {
			if (result.type === 'redirect') toast.success(`Eliminamos ${store.name}.`);

			await update();
			removing = false;
			if (result.type !== 'redirect') removeOpen = false;
		};
	};
</script>

<svelte:head>
	<title>{store.name} — Plataforma Globerce</title>
</svelte:head>

<PageTemplate title={store.name} back={{ href: '/platform/stores', label: 'Tiendas' }}>
	{#snippet badge()}
		<StoreStatusBadge status={store.status} />
	{/snippet}

	{#snippet intro()}
		<a
			href={data.storeUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
		>
			{store.slug}
			<ExternalLink class="size-3.5" />
		</a>
		{#if store.custom_domain}
			<p class="text-muted-foreground text-sm">
				Dominio propio: {store.custom_domain}
				{#if store.custom_domain_status}
					· {DOMAIN_STATUS_LABEL[store.custom_domain_status]}
				{/if}
			</p>
		{/if}
	{/snippet}

	{#snippet actions()}
		<form
			id="estado"
			class="flex flex-wrap gap-2"
			method="POST"
			action="?/status"
			use:enhance={onDelete}
		>
			{#if store.status === 'suspended'}
				<input type="hidden" name="status" value="active" />
				<Button type="submit">Reactivar tienda</Button>
				<Button type="button" variant="destructive" onclick={() => (removeOpen = true)}>
					Eliminar tienda
				</Button>
			{:else}
				<input type="hidden" name="status" value="suspended" />
				<Button
					type="button"
					variant="destructive"
					onclick={() =>
						deletion.ask('estado', `¿Suspender ${store.name}?`, {
							description: 'Su tienda dejará de verse en internet.',
							confirmLabel: 'Suspender',
							pendingLabel: 'Suspendiendo…'
						})}
				>
					Suspender
				</Button>
			{/if}
		</form>
	{/snippet}

	<div class="grid gap-6 lg:grid-cols-3">
		<section class="border-border bg-card rounded-lg space-y-3 border p-6 text-sm">
			<h2 class="text-lg">Suscripción</h2>
			<dl class="space-y-2">
				<div class="flex justify-between gap-4">
					<dt class="text-muted-foreground">Plan</dt>
					<dd>
						{currentPlan ? `${currentPlan.name} · ${formatMoney(currentPlan.price_cop)}` : '—'}
					</dd>
				</div>
				<div class="flex justify-between gap-4">
					<dt class="text-muted-foreground">Pago hasta</dt>
					<dd>{formatDate(store.current_period_end)}</dd>
				</div>
				<div class="flex justify-between gap-4">
					<dt class="text-muted-foreground">Prueba hasta</dt>
					<dd>{formatDate(store.trial_ends_at)}</dd>
				</div>
				<div class="flex justify-between gap-4">
					<dt class="text-muted-foreground">Creada</dt>
					<dd>{formatDate(store.created_at)}</dd>
				</div>
				<div class="flex justify-between gap-4">
					<dt class="text-muted-foreground">Productos / pedidos</dt>
					<dd class="tabular-nums">{store.product_count} / {store.order_count}</dd>
				</div>
			</dl>

			{#if store.subscription_notes}
				<p class="bg-muted p-3 text-xs">{store.subscription_notes}</p>
			{/if}

			<h3 class="pt-2 font-medium">Equipo</h3>
			<ul class="space-y-1">
				{#each store.members as member (member.user_id)}
					<li class="flex justify-between gap-2">
						<span class="truncate">{member.email}</span>
						<span class="text-muted-foreground">{MEMBER_ROLE_LABEL[member.role]}</span>
					</li>
				{/each}
			</ul>
		</section>

		<section class="border-border bg-card rounded-lg border p-6">
			<h2 class="mb-4 text-lg">Registrar pago</h2>

			{#key store.current_period_end}
				<form method="POST" action="?/payment" class="space-y-3" use:enhance>
					<div class="space-y-1.5">
						<Label for="amountCop">Monto (pesos)</Label>
						<MoneyField
							id="amountCop"
							name="amountCop"
							required
							value={currentPlan?.price_cop ?? null}
						/>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div class="space-y-1.5">
							<Label for="periodStart">Desde</Label>
							<Input
								id="periodStart"
								name="periodStart"
								type="date"
								required
								value={period.start}
							/>
						</div>
						<div class="space-y-1.5">
							<Label for="periodEnd">Hasta</Label>
							<Input id="periodEnd" name="periodEnd" type="date" required value={period.end} />
						</div>
					</div>

					<div class="space-y-1.5">
						<Label for="method">Medio</Label>
						<Input id="method" name="method" required list="payment-methods" value="nequi" />
						<datalist id="payment-methods">
							<option value="nequi"></option>
							<option value="transferencia"></option>
							<option value="efectivo"></option>
						</datalist>
					</div>

					<div class="space-y-1.5">
						<Label for="reference">Comprobante</Label>
						<Input id="reference" name="reference" placeholder="Opcional" />
					</div>

					<Button type="submit" class="w-full">Registrar pago</Button>
				</form>
			{/key}
		</section>

		<section class="border-border bg-card rounded-lg border p-6">
			<h2 class="mb-4 text-lg">Cambiar plan</h2>

			<form method="POST" action="?/plan" class="space-y-3" use:enhance>
				<div class="space-y-1.5">
					<Label for="planCode">Plan</Label>
					<SelectField
						id="planCode"
						name="planCode"
						bind:value={planCode}
						options={data.plans
							.filter((plan) => plan.active)
							.map((plan) => ({
								value: plan.code,
								label: `${plan.name} · ${formatMoney(plan.price_cop)}`
							}))}
					/>
				</div>

				<div class="space-y-1.5">
					<Label for="notes">Nota</Label>
					<Textarea
						id="notes"
						name="notes"
						rows={3}
						placeholder="Por qué el cambio (opcional)"
						value={store.subscription_notes ?? ''}
					/>
				</div>

				<Button type="submit" variant="outline" class="w-full">Guardar plan</Button>
			</form>
		</section>
	</div>

	<section class="border-border bg-card mt-6 overflow-hidden rounded-lg border">
		<h2 class="border-border border-b px-4 py-3 text-lg">Pagos</h2>

		{#if store.payments.length === 0}
			<p class="text-muted-foreground px-4 py-8 text-center text-sm">Todavía no hay pagos.</p>
		{:else}
			<Table.Root class="table-stack">
				<Table.Header>
					<Table.Row>
						<Table.Head>Período</Table.Head>
						<Table.Head>Monto</Table.Head>
						<Table.Head>Medio</Table.Head>
						<Table.Head>Registró</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each store.payments as payment (payment.id)}
						<Table.Row>
							<Table.Cell data-label="Período">
								{formatDate(payment.period_start)} – {formatDate(payment.period_end)}
							</Table.Cell>
							<Table.Cell data-label="Monto" class="tabular-nums">
								{formatMoney(payment.amount_cop)}
							</Table.Cell>
							<Table.Cell data-label="Medio">
								{payment.method}{payment.reference ? ` · ${payment.reference}` : ''}
							</Table.Cell>
							<Table.Cell data-label="Registró" class="text-muted-foreground">
								{payment.recorded_by ?? '—'}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{/if}
	</section>

	<ConfirmDeleteDialog
		bind:open={deletion.open}
		title={deletion.target?.title ?? ''}
		description={deletion.target?.description}
		form={deletion.target?.formId ?? ''}
		confirmLabel={deletion.target?.confirmLabel}
		pendingLabel={deletion.target?.pendingLabel}
		pending={deletion.pending}
	/>

	{#if store.status === 'suspended'}
		<form id="store-delete" method="POST" action="?/delete" use:enhance={onRemove}></form>

		<TypedConfirmDialog
			bind:open={removeOpen}
			title={`¿Eliminar ${store.name}?`}
			description="No tiene vuelta atrás. Se borran sus productos, pedidos, fotos, pagos de la suscripción y su dominio propio. Las cuentas del equipo siguen existiendo, sin esta tienda."
			form="store-delete"
			name="confirmSlug"
			expected={store.slug}
			label="Escribe la dirección de la tienda"
			confirmLabel="Eliminar tienda"
			pending={removing}
		/>
	{/if}
</PageTemplate>
