<script lang="ts">
	// Tipos
	import type { PageData } from './$types';

	// Iconos
	import Search from '@lucide/svelte/icons/search';

	// App
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	// Componentes
	import { Badge } from '$lib/components/atoms/badge';
	import { Checkbox } from '$lib/components/atoms/checkbox';
	import { Input } from '$lib/components/atoms/input';
	import { Label } from '$lib/components/atoms/label';
	import * as Table from '$lib/components/atoms/table';
	import SelectField from '$lib/components/molecules/SelectField.svelte';
	import StoreStatusBadge from '$lib/components/molecules/StoreStatusBadge.svelte';
	import PageTemplate from '$lib/components/templates/PageTemplate.svelte';

	// Dominio
	import { STORE_STATUS_LABEL } from '$lib/domain/account';
	import { ACTIVATION_STAGE_LABEL, ACTIVATION_STAGES, daysSince } from '$lib/domain/activation';

	// Utilidades
	import { formatMoney } from '$lib/utils/money';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const statusOptions = [
		{ value: 'all', label: 'Todos los estados' },
		...Object.entries(STORE_STATUS_LABEL).map(([value, label]) => ({ value, label }))
	];

	/** A partir de cuántos días sin entrar al panel la tienda se marca. */
	const IDLE_DAYS = 7;

	const now = new Date();

	const stageOptions = [
		{ value: 'all', label: 'Todas las etapas' },
		...ACTIVATION_STAGES.map((value) => ({ value, label: ACTIVATION_STAGE_LABEL[value] }))
	];

	const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' });

	function daysLabel(count: number): string {
		return count === 1 ? '1 día' : `${count} días`;
	}

	/** «hoy» si fue hoy; si no, «hace N días». */
	function elapsed(count: number): string {
		return count === 0 ? 'hoy' : `hace ${daysLabel(count)}`;
	}

	function formatDate(value: string | null): string {
		return value ? dateFormatter.format(new Date(`${value.slice(0, 10)}T00:00:00Z`)) : '—';
	}

	function applyFilter(name: string, value: string | null): void {
		const url = new URL(page.url);

		if (value) url.searchParams.set(name, value);
		else url.searchParams.delete(name);

		goto(url, { keepFocus: true, noScroll: true });
	}

	function planName(code: string | null): string {
		return data.plans.find((plan) => plan.code === code)?.name ?? code ?? '—';
	}
</script>

<svelte:head>
	<title>Tiendas — Plataforma Globerce</title>
</svelte:head>

<PageTemplate
	title="Tiendas"
	description="{data.stores.length} {data.stores.length === 1
		? 'tienda'
		: 'tiendas'} con este filtro."
>
	<section
		class="border-border bg-card rounded-lg mb-6 grid gap-3 border p-4 sm:grid-cols-[1fr_14rem_14rem_auto]"
	>
		<form
			class="relative"
			onsubmit={(event) => {
				event.preventDefault();
				const value = new FormData(event.currentTarget).get('q');
				applyFilter('q', typeof value === 'string' && value.trim() ? value.trim() : null);
			}}
		>
			<Search class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
			<Input
				name="q"
				value={data.filters.q ?? ''}
				placeholder="Nombre, dirección o correo del creador"
				class="pl-9"
				aria-label="Buscar tiendas"
			/>
		</form>

		<SelectField
			name="status"
			aria-label="Estado"
			value={data.filters.status ?? 'all'}
			options={statusOptions}
			onValueChange={(value) => applyFilter('status', value === 'all' ? null : value)}
		/>

		<SelectField
			name="stage"
			aria-label="Etapa"
			value={data.filters.stage ?? 'all'}
			options={stageOptions}
			onValueChange={(value) => applyFilter('stage', value === 'all' ? null : value)}
		/>

		<div class="flex items-center gap-2">
			<Checkbox
				id="vencidas"
				checked={data.filters.overdue}
				onCheckedChange={(checked) => applyFilter('vencidas', checked ? '1' : null)}
			/>
			<Label for="vencidas" class="whitespace-nowrap">Solo vencidas</Label>
		</div>
	</section>

	{#if data.stores.length === 0}
		<p
			class="text-muted-foreground border-border border border-dashed px-6 py-16 text-center text-sm"
		>
			Ninguna tienda coincide.
		</p>
	{:else}
		<div class="border-border bg-card overflow-hidden rounded-lg border">
			<Table.Root class="table-stack">
				<Table.Header>
					<Table.Row>
						<Table.Head>Tienda</Table.Head>
						<Table.Head>Estado</Table.Head>
						<Table.Head>Va en</Table.Head>
						<Table.Head>Plan</Table.Head>
						<Table.Head>Pago hasta</Table.Head>
						<Table.Head>Creador</Table.Head>
						<Table.Head class="text-right">Productos / pedidos</Table.Head>
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{#each data.stores as store (store.id)}
						{@const owner = store.members.find((member) => member.role === 'owner')}
						{@const stageDays = daysSince(store.activation.stage_reached_at, now)}
						{@const idleDays = store.activation.last_seen_at
							? daysSince(store.activation.last_seen_at, now)
							: null}
						<Table.Row>
							<Table.Cell data-label="Tienda">
								<a href={`/platform/stores/${store.id}`} class="font-medium hover:underline">
									{store.name}
								</a>
								<p class="text-muted-foreground text-xs">{store.slug}</p>
							</Table.Cell>
							<Table.Cell data-label="Estado"><StoreStatusBadge status={store.status} /></Table.Cell
							>
							<Table.Cell data-label="Va en">
								<Badge variant="secondary">{ACTIVATION_STAGE_LABEL[store.activation.stage]}</Badge>
								{#if store.activation.stage !== 'paying'}
									<p class="text-muted-foreground mt-1 text-xs">{elapsed(stageDays)}</p>
								{/if}
								{#if idleDays !== null && idleDays > IDLE_DAYS}
									<p class="text-destructive text-xs">Sin entrar hace {daysLabel(idleDays)}</p>
								{/if}
							</Table.Cell>
							<Table.Cell data-label="Plan">{planName(store.plan_code)}</Table.Cell>
							<Table.Cell data-label="Pago hasta">{formatDate(store.current_period_end)}</Table.Cell
							>
							<Table.Cell data-label="Creador" class="max-w-48 truncate">
								{owner?.email ?? '—'}
							</Table.Cell>
							<Table.Cell data-label="Productos / pedidos" class="text-right tabular-nums">
								{store.product_count} / {store.order_count}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{/if}

	<section class="mt-8">
		<h2 class="mb-3 text-lg">Planes</h2>
		<div class="grid gap-4 sm:grid-cols-2">
			{#each data.plans as plan (plan.code)}
				<div class="border-border bg-card rounded-lg border p-4 text-sm">
					<p class="font-medium">{plan.name} · {formatMoney(plan.price_cop)}/mes</p>
					<p class="text-muted-foreground">
						{plan.max_products ?? 'Sin límite de'} productos ·
						{plan.max_orders_per_month ?? 'sin límite de'} pedidos/mes ·
						{plan.max_images_per_product ?? 'sin límite de'} fotos por producto
						{plan.custom_domain ? '· dominio propio' : ''}
					</p>
				</div>
			{/each}
		</div>
	</section>
</PageTemplate>
