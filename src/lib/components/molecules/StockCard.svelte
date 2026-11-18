<script lang="ts">
	// Utilidades
	import { cn } from '$lib/utils';

	/**
	 * La ficha de inventario de una variación, dibujada con HTML: cuántas
	 * quedan y qué tallas hay. La L agotada va en terracota, que es el color
	 * del kit para «queda poco, alguien espera»; la M elegida, en teal.
	 *
	 * Decorativa, como las demás fichas del sitio comercial.
	 */
	interface Props {
		class?: string;
	}

	let { class: className }: Props = $props();

	const sizes = [
		{ name: 'S', status: 'libre' },
		{ name: 'M', status: 'elegida' },
		{ name: 'L', status: 'agotada' },
		{ name: 'XL', status: 'libre' }
	] as const;
</script>

<div
	aria-hidden="true"
	class={cn(
		'bg-card text-card-foreground border-border rounded-lg border p-5 shadow-2xl select-none',
		className
	)}
>
	<p class="text-muted-foreground text-xs font-medium tracking-[0.14em] uppercase">Inventario</p>
	<p class="mt-2 font-semibold">Blusa Vera · verde</p>

	<div class="mt-3 flex items-baseline gap-2">
		<span class="text-primary text-4xl font-semibold tabular-nums">3</span>
		<span class="text-muted-foreground text-sm">quedan en talla M</span>
	</div>

	<ul class="mt-4 flex flex-wrap gap-1.5">
		{#each sizes as size (size.name)}
			<li
				class={cn(
					'rounded-full border px-3 py-1 text-xs font-medium',
					size.status === 'elegida' && 'border-primary bg-primary text-primary-foreground',
					size.status === 'agotada' && 'border-caution text-caution line-through',
					size.status === 'libre' && 'border-border text-muted-foreground'
				)}
			>
				{size.name}
			</li>
		{/each}
	</ul>
</div>
