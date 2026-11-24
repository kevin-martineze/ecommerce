<script lang="ts">
	// Tipos
	import type { BadgeVariant } from '$lib/components/atoms/badge';
	import type { ModuleName } from '$lib/components/molecules/ModuleIcon.svelte';

	// Componentes
	import { Badge } from '$lib/components/atoms/badge';

	// Dominio
	import { ORDER_STATUS_LABEL } from '$lib/domain/orders';

	// Utilidades
	import { cn } from '$lib/utils';
	import { formatMoney } from '$lib/utils/money';

	/**
	 * Mini-vista del panel para cada módulo de la landing: lo que el módulo
	 * muestra cuando se usa, en una ficha pequeña y pintada con HTML.
	 *
	 * No es una captura: son datos de ejemplo con tokens, así que cambia de
	 * tema con la página y no pesa nada. Lo que dice ya está en el texto de
	 * al lado, por eso se oculta de los lectores de pantalla.
	 */
	interface Props {
		name: ModuleName;
		class?: string;
	}

	let { name, class: className }: Props = $props();

	const sizes = ['S', 'M', 'L', 'XL'];

	const colors = [
		{ name: 'verde', swatch: 'bg-success' },
		{ name: 'terracota', swatch: 'bg-chart-5' },
		{ name: 'negro', swatch: 'bg-foreground' }
	];

	/** Existencias por talla. Lo que queda poco va en terracota; lo agotado, en rojo. */
	const stock = [
		{ size: 'S', left: 12, width: 'w-3/4' },
		{ size: 'M', left: 3, width: 'w-1/5' },
		{ size: 'L', left: 0, width: 'w-0' }
	];

	/** Pedidos recientes: uno pagado en línea, uno que llegó por WhatsApp y uno ya enviado. */
	const orders: {
		id: string;
		total: number;
		label: string;
		variant: BadgeVariant;
		tone?: string;
	}[] = [
		{ id: '#1042', total: 89900, label: 'Pagado', variant: 'default' },
		{
			id: '#1041',
			total: 129900,
			label: 'Por WhatsApp',
			variant: 'default',
			tone: 'bg-whatsapp text-whatsapp-foreground'
		},
		{ id: '#1040', total: 59900, label: ORDER_STATUS_LABEL.shipped, variant: 'outline' }
	];

	/** Zonas de envío con su costo, y el monto desde el que el envío sale gratis. */
	const zones = [
		{ name: 'Bogotá', cost: 8000 },
		{ name: 'Medellín', cost: 12000 },
		{ name: 'Resto del país', cost: 15000 }
	];

	const freeFrom = 150000;
</script>

<div
	aria-hidden="true"
	class={cn(
		'bg-card text-card-foreground border-border flex flex-col justify-center gap-3 rounded-lg border p-4 text-sm select-none',
		className
	)}
>
	{#if name === 'catalogo'}
		<p class="font-semibold">Blusa Vera</p>

		<div>
			<p class="text-muted-foreground text-xs">Talla</p>
			<ul class="mt-1.5 flex gap-1.5">
				{#each sizes as size (size)}
					<li
						class={cn(
							'rounded-full border px-2.5 py-0.5 text-xs font-medium',
							size === 'M'
								? 'border-primary bg-primary text-primary-foreground'
								: 'border-border text-muted-foreground'
						)}
					>
						{size}
					</li>
				{/each}
			</ul>
		</div>

		<div>
			<p class="text-muted-foreground text-xs">Color</p>
			<ul class="mt-1.5 flex gap-2">
				{#each colors as color (color.name)}
					<li class={cn('border-border size-5 rounded-full border', color.swatch)}></li>
				{/each}
			</ul>
		</div>
	{:else if name === 'inventario'}
		<p class="font-semibold">Blusa Vera · verde</p>

		<ul class="flex flex-col gap-2.5">
			{#each stock as row (row.size)}
				<li class="flex items-center gap-3">
					<span class="w-14 font-medium">Talla {row.size}</span>
					{#if row.left === 0}
						<span class="text-sale ml-auto font-medium">Agotada</span>
					{:else}
						<span class="bg-muted relative h-1.5 flex-1 overflow-hidden rounded-full">
							<span
								class={cn(
									'absolute inset-y-0 left-0 rounded-full',
									row.left <= 3 ? 'bg-caution' : 'bg-primary',
									row.width
								)}
							></span>
						</span>
						<span class="w-5 text-right font-medium tabular-nums">{row.left}</span>
					{/if}
				</li>
			{/each}
		</ul>
	{:else if name === 'pedidos'}
		<ul class="divide-border flex flex-col divide-y">
			{#each orders as order (order.id)}
				<li class="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
					<div class="min-w-0">
						<p class="font-medium tabular-nums">{order.id}</p>
						<p class="text-muted-foreground text-xs tabular-nums">{formatMoney(order.total)}</p>
					</div>
					<Badge variant={order.variant} class={order.tone}>{order.label}</Badge>
				</li>
			{/each}
		</ul>
	{:else if name === 'envios'}
		<ul class="divide-border flex flex-col divide-y">
			{#each zones as zone (zone.name)}
				<li class="flex items-center justify-between py-2 first:pt-0 last:pb-0">
					<span>{zone.name}</span>
					<span class="font-medium tabular-nums">{formatMoney(zone.cost)}</span>
				</li>
			{/each}
		</ul>
		<p class="text-success font-medium">Gratis desde {formatMoney(freeFrom)}</p>
	{/if}
</div>
