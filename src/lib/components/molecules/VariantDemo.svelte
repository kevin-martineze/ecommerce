<script lang="ts">
	// Dominio
	import { PHOTO_PRODUCT } from '$lib/config/photos';

	// Utilidades
	import { cn } from '$lib/utils';

	/**
	 * La ficha de un producto en la tienda, según cómo se divida.
	 *
	 * Es la demostración de lo que distingue al catálogo: cada rubro declara
	 * sus ejes y la ficha se acomoda. Ropa: talla y color, con una talla
	 * agotada. Café: molienda y peso, con precio por presentación. Pieza única:
	 * ningún eje y una sola existencia. Las muestras de color, y el tono que
	 * ocupa el lugar de la foto mientras carga, son contenido —el producto—,
	 * no interfaz, por eso van en línea.
	 *
	 * Decorativa: el texto de al lado dice lo mismo con palabras.
	 */
	export type Industry = 'clothing' | 'coffee' | 'single';

	interface Props {
		industry: Industry;
		class?: string;
	}

	let { industry, class: className }: Props = $props();

	const sheets = {
		clothing: {
			name: 'Blusa Vera',
			price: '$89.900',
			tone: 'oklch(0.86 0.02 60)',
			note: 'Quedan 3 en talla M',
			axes: [
				{
					name: 'Talla',
					options: [
						{ value: 'S', state: 'available' },
						{ value: 'M', state: 'selected' },
						{ value: 'L', state: 'soldOut' },
						{ value: 'XL', state: 'available' }
					]
				},
				{
					name: 'Color',
					options: [
						{ value: 'Verde', state: 'selected', tone: 'oklch(0.55 0.08 160)' },
						{ value: 'Arena', state: 'available', tone: 'oklch(0.82 0.04 80)' },
						{ value: 'Negro', state: 'available', tone: 'oklch(0.25 0.01 60)' }
					]
				}
			]
		},
		coffee: {
			name: 'Café Huila',
			price: '$38.000',
			tone: 'oklch(0.78 0.04 40)',
			note: '500 g · molienda fina',
			axes: [
				{
					name: 'Molienda',
					options: [
						{ value: 'Grano', state: 'available' },
						{ value: 'Fina', state: 'selected' },
						{ value: 'Media', state: 'available' }
					]
				},
				{
					name: 'Peso',
					options: [
						{ value: '250 g', state: 'available' },
						{ value: '500 g', state: 'selected' },
						{ value: '1 kg', state: 'available' }
					]
				}
			]
		},
		single: {
			name: 'Atlas de la Sierra',
			price: '$64.000',
			tone: 'oklch(0.72 0.05 25)',
			note: 'Pieza única · 1 disponible',
			axes: []
		}
	} as const;

	const sheet = $derived(sheets[industry]);
	const photo = $derived(PHOTO_PRODUCT[industry]);
</script>

<div
	aria-hidden="true"
	class={cn(
		'bg-card text-card-foreground border-border w-full max-w-xs rounded-lg border p-4 shadow-2xl select-none',
		className
	)}
>
	<img
		src={photo.src}
		srcset={photo.srcset}
		sizes="18rem"
		width={photo.width}
		height={photo.height}
		alt={photo.alt}
		loading="lazy"
		decoding="async"
		class="aspect-[4/3] w-full rounded-[calc(var(--radius)-6px)] object-cover"
		style="background-color: {sheet.tone}"
	/>

	<div class="mt-4 flex items-baseline justify-between gap-3">
		<p class="font-semibold">{sheet.name}</p>
		<p class="text-primary font-semibold tabular-nums">{sheet.price}</p>
	</div>

	{#each sheet.axes as axis (axis.name)}
		<div class="mt-4">
			<p class="text-muted-foreground text-xs font-medium tracking-[0.14em] uppercase">
				{axis.name}
			</p>
			<ul class="mt-2 flex flex-wrap gap-1.5">
				{#each axis.options as option (option.value)}
					<li
						class={cn(
							'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
							option.state === 'selected' && 'border-primary bg-primary text-primary-foreground',
							option.state === 'soldOut' && 'border-caution text-caution line-through',
							option.state === 'available' && 'border-border text-muted-foreground'
						)}
					>
						{#if 'tone' in option}
							<span class="size-2.5 rounded-full" style="background-color: {option.tone}"></span>
						{/if}
						{option.value}
					</li>
				{/each}
			</ul>
		</div>
	{/each}

	<p class="text-muted-foreground mt-4 text-xs">{sheet.note}</p>

	<p
		class="bg-foreground text-background mt-3 rounded-full py-2.5 text-center text-sm font-semibold"
	>
		Añadir al carrito
	</p>
</div>
