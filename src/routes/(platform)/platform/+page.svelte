<script lang="ts">
	// Tipos
	import type { PageData } from './$types';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import * as Card from '$lib/components/atoms/card';
	import * as Table from '$lib/components/atoms/table';
	import AreaChart from '$lib/components/molecules/AreaChart.svelte';
	import BarChart from '$lib/components/molecules/BarChart.svelte';
	import PageTemplate from '$lib/components/templates/PageTemplate.svelte';

	// Dominio
	import { ACTIVATION_STAGE_LABEL, ACTIVATION_STAGES } from '$lib/domain/activation';

	// Utilidades
	import { formatCompactMoney, formatMoney } from '$lib/utils/money';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const dashboard = $derived(data.dashboard);

	/** Una fila por etapa, con cuántas tiendas la alcanzaron (acumulado). */
	const funnel = $derived(
		ACTIVATION_STAGES.map((stage) => ({
			stage,
			label: ACTIVATION_STAGE_LABEL[stage],
			count: dashboard.activation[stage]
		}))
	);

	/** Porcentaje sobre las tiendas creadas. La primera etapa siempre es 100%. */
	function percentOfCreated(count: number): number {
		return dashboard.activation.created > 0
			? Math.round((count / dashboard.activation.created) * 100)
			: 0;
	}

	const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' });
	const dateTimeFormatter = new Intl.DateTimeFormat('es-CO', {
		day: '2-digit',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit'
	});
	const monthFormatter = new Intl.DateTimeFormat('es-CO', { month: 'short', timeZone: 'UTC' });

	function formatDate(value: string | null): string {
		return value ? dateFormatter.format(new Date(`${value.slice(0, 10)}T00:00:00Z`)) : '—';
	}

	function days(count: number): string {
		return count === 1 ? '1 día' : `${count} días`;
	}

	/** "2026-11" → "nov": el nombre corto del mes en la serie. */
	function monthLabel(month: string): string {
		const [year, monthNumber] = month.split('-');

		return monthFormatter.format(new Date(Date.UTC(Number(year), Number(monthNumber) - 1, 1)));
	}

	/** Una barra por mes de la serie. La última es el mes en curso y se resalta. */
	const revenueBars = $derived(
		dashboard.monthly.map((point, index, months) => ({
			key: point.month,
			label: monthLabel(point.month),
			value: point.revenue_cop,
			text: formatCompactMoney(point.revenue_cop),
			title: `${monthLabel(point.month)}: ${formatMoney(point.revenue_cop)}`,
			current: index === months.length - 1
		}))
	);

	const storeBars = $derived(
		dashboard.monthly.map((point, index, months) => ({
			key: point.month,
			label: monthLabel(point.month),
			value: point.new_stores,
			text: String(point.new_stores),
			title: `${monthLabel(point.month)}: ${point.new_stores} ${point.new_stores === 1 ? 'tienda nueva' : 'tiendas nuevas'}`,
			current: index === months.length - 1
		}))
	);

	/** Una columna por mes con las tiendas que existían al cerrar ese mes. */
	const totalPoints = $derived(
		dashboard.monthly.map((point, index, months) => ({
			key: point.month,
			label: monthLabel(point.month),
			value: point.total_stores,
			text: String(point.total_stores),
			title: `${monthLabel(point.month)}: ${point.total_stores} ${point.total_stores === 1 ? 'tienda' : 'tiendas'} en total`,
			current: index === months.length - 1
		}))
	);

	/** Cambio del mes contra el anterior, o null si no hay con qué comparar. */
	const revenueChange = $derived(
		dashboard.revenue_last_month > 0
			? Math.round(
					((dashboard.revenue_this_month - dashboard.revenue_last_month) /
						dashboard.revenue_last_month) *
						100
				)
			: null
	);
</script>

<svelte:head>
	<title>Resumen — Plataforma Globerce</title>
</svelte:head>

<PageTemplate title="Resumen" description="Cuánto entra, quién paga y quién está por vencer.">
	{#snippet actions()}
		<form method="POST" action="?/expirations" use:enhance>
			<Button type="submit" variant="outline">Revisar vencimientos</Button>
		</form>
	{/snippet}

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>Cobrado este mes</Card.Description>
				<Card.Title class="font-sans text-3xl tabular-nums">
					{formatMoney(dashboard.revenue_this_month)}
				</Card.Title>
			</Card.Header>
			<Card.Content class="text-muted-foreground text-xs">
				{#if revenueChange === null}
					Mes anterior: {formatMoney(dashboard.revenue_last_month)}.
				{:else}
					{revenueChange >= 0 ? '+' : ''}{revenueChange}% frente a {formatMoney(
						dashboard.revenue_last_month
					)} el mes anterior.
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>Ingreso mensual recurrente</Card.Description>
				<Card.Title class="font-sans text-3xl tabular-nums">{formatMoney(dashboard.mrr)}</Card.Title
				>
			</Card.Header>
			<Card.Content class="text-muted-foreground text-xs">
				Suma del plan de las tiendas que pagan y siguen activas.
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>Tiendas que pagan</Card.Description>
				<Card.Title class="font-sans text-3xl tabular-nums">{dashboard.paying_stores}</Card.Title>
			</Card.Header>
			<Card.Content class="text-muted-foreground text-xs">
				De {dashboard.stores.total} en total · {dashboard.stores.trial} en prueba ·
				{dashboard.stores.suspended} suspendidas.
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>Vencidas</Card.Description>
				<Card.Title class="font-sans text-3xl tabular-nums">{dashboard.stores.past_due}</Card.Title>
			</Card.Header>
			<Card.Content class="text-muted-foreground text-xs">
				Siguen vendiendo, pero no han pagado el período.
			</Card.Content>
		</Card.Root>
	</div>

	<div class="mt-8 grid gap-6 lg:grid-cols-2">
		<section class="border-border bg-card rounded-lg border p-6">
			<header class="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
				<h2 class="text-lg">Cobrado por mes</h2>
				<p class="text-muted-foreground text-xs">Últimos seis meses, hora de Colombia.</p>
			</header>
			<BarChart
				label="Cobrado por mes"
				bars={revenueBars}
				empty="Todavía no hay cobros en estos meses."
			/>
		</section>

		<section class="border-border bg-card rounded-lg border p-6">
			<header class="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
				<h2 class="text-lg">Tiendas nuevas por mes</h2>
				<p class="text-muted-foreground text-xs">Tiendas creadas en cada mes.</p>
			</header>
			<BarChart
				label="Tiendas nuevas por mes"
				bars={storeBars}
				empty="Todavía no se crean tiendas en estos meses."
			/>
		</section>
	</div>

	<section class="border-border bg-card mt-6 rounded-lg border p-6">
		<header class="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
			<h2 class="text-lg">Tiendas acumuladas</h2>
			<p class="text-muted-foreground text-xs">Tiendas que existían al cierre de cada mes.</p>
		</header>
		<AreaChart label="Tiendas acumuladas" points={totalPoints} empty="Todavía no hay tiendas." />
	</section>

	<div class="mt-8 grid gap-6 lg:grid-cols-2">
		<section class="border-border bg-card overflow-hidden rounded-lg border">
			<header class="border-border flex items-center justify-between border-b px-4 py-3">
				<h2 class="text-lg">Por cobrar</h2>
				<a href="/platform/stores?vencidas=1" class="text-muted-foreground text-xs underline">
					Ver vencidas
				</a>
			</header>

			{#if dashboard.overdue.length === 0 && dashboard.trials_ending.length === 0}
				<p class="text-muted-foreground px-4 py-8 text-center text-sm">
					Nadie por vencer esta semana.
				</p>
			{:else}
				<ul class="divide-border divide-y">
					{#each dashboard.overdue as store (store.id)}
						<li class="flex items-center justify-between gap-4 px-4 py-3 text-sm">
							<div class="min-w-0">
								<a href={`/platform/stores/${store.id}`} class="font-medium hover:underline">
									{store.name}
								</a>
								<p class="text-muted-foreground truncate text-xs">
									{store.owner_email ?? store.slug}
								</p>
							</div>
							<span class="text-destructive whitespace-nowrap">
								Vencida hace {days(store.days_overdue)}
							</span>
						</li>
					{/each}

					{#each dashboard.trials_ending as store (store.id)}
						<li class="flex items-center justify-between gap-4 px-4 py-3 text-sm">
							<div class="min-w-0">
								<a href={`/platform/stores/${store.id}`} class="font-medium hover:underline">
									{store.name}
								</a>
								<p class="text-muted-foreground truncate text-xs">
									{store.owner_email ?? store.slug}
								</p>
							</div>
							<span class="text-muted-foreground whitespace-nowrap">
								{store.days_left < 0
									? 'Prueba terminada'
									: store.days_left === 0
										? 'La prueba termina hoy'
										: `Prueba termina en ${days(store.days_left)}`}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="border-border bg-card overflow-hidden rounded-lg border">
			<header class="border-border flex items-center justify-between border-b px-4 py-3">
				<h2 class="text-lg">Últimos pagos</h2>
				<a href="/platform/payments" class="text-muted-foreground text-xs underline">Ver por mes</a>
			</header>

			{#if dashboard.recent_payments.length === 0}
				<p class="text-muted-foreground px-4 py-8 text-center text-sm">Todavía no hay pagos.</p>
			{:else}
				<Table.Root>
					<Table.Body>
						{#each dashboard.recent_payments as payment (payment.id)}
							<Table.Row>
								<Table.Cell>
									<a
										href={`/platform/stores/${payment.store_id}`}
										class="font-medium hover:underline"
									>
										{payment.store_name}
									</a>
									<p class="text-muted-foreground text-xs">
										{formatDate(payment.period_start)} – {formatDate(payment.period_end)} · {payment.method}
									</p>
								</Table.Cell>
								<Table.Cell class="text-right tabular-nums">
									{formatMoney(payment.amount_cop)}
									<p class="text-muted-foreground text-xs">
										{dateTimeFormatter.format(new Date(payment.created_at))}
									</p>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</section>
	</div>
	<section class="border-border bg-card mt-8 rounded-lg border p-6">
		<header class="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
			<h2 class="text-lg">Embudo de activación</h2>
			<p class="text-muted-foreground text-xs">Cuántas tiendas llegan a cada etapa.</p>
		</header>

		<ol class="space-y-4">
			{#each funnel as row (row.stage)}
				<li>
					<a href={`/platform/stores?stage=${row.stage}`} class="group block text-sm">
						<span class="flex justify-between gap-4">
							<span class="font-medium group-hover:underline">{row.label}</span>
							<span class="tabular-nums">
								{row.count}
								<span class="text-muted-foreground text-xs">· {percentOfCreated(row.count)}%</span>
							</span>
						</span>
						<span class="bg-muted mt-1.5 block h-2 overflow-hidden rounded-full">
							<span
								class="bg-primary block h-full rounded-full"
								style="width: {percentOfCreated(row.count)}%"
							></span>
						</span>
					</a>
				</li>
			{/each}
		</ol>
	</section>
</PageTemplate>
