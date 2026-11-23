<script lang="ts">
	// Utilidades
	import { cn } from '$lib/utils';

	interface Point {
		key: string;
		label: string;
		value: number;
		/** Lo que se lee bajo la gráfica, sobre cada mes. */
		text: string;
		/** Lo que aparece al pasar el cursor. */
		title: string;
		/** Resalta el valor (el mes en curso). */
		current: boolean;
	}

	interface Props {
		/** Nombre accesible de la gráfica. */
		label: string;
		points: Point[];
		/** Qué decir cuando todos los puntos están en cero. */
		empty: string;
	}

	let { label, points, empty }: Props = $props();

	/** El punto más alto marca el borde de arriba. */
	const top = $derived(Math.max(1, ...points.map((point) => point.value)));
	const hasData = $derived(points.some((point) => point.value > 0));

	/**
	 * Cada punto en porcentaje: `x` lo centra en su columna (la misma que ocupa su
	 * texto bajo la gráfica) y `height` es su altura sobre la base.
	 */
	const coords = $derived(
		points.map((point, index) => ({
			key: point.key,
			x: ((index + 0.5) / points.length) * 100,
			height: (point.value / top) * 100
		}))
	);

	/** La línea, en un viewBox de 100 × 100 donde el eje y crece hacia abajo. */
	const line = $derived(coords.map((coord) => `${coord.x},${100 - coord.height}`).join(' '));

	/** El área: la línea cerrada hasta la base, por debajo de los dos extremos. */
	const area = $derived.by(() => {
		const first = coords.at(0);
		const last = coords.at(-1);

		if (!first || !last) return '';

		return `M${first.x},100 L${line} L${last.x},100 Z`;
	});
</script>

{#if hasData}
	<div class="flex flex-col gap-2">
		<div class="border-border relative h-32 w-full border-b">
			<svg
				class="absolute inset-0 size-full overflow-visible"
				viewBox="0 0 100 100"
				preserveAspectRatio="none"
				role="img"
				aria-label={label}
			>
				<path d={area} class="fill-primary/15" />
				<polyline
					points={line}
					class="stroke-primary"
					fill="none"
					stroke-width="2"
					stroke-linejoin="round"
					vector-effect="non-scaling-stroke"
				/>
			</svg>
			{#each coords as coord (coord.key)}
				<span
					class="bg-primary ring-card absolute size-2 -translate-x-1/2 translate-y-1/2 rounded-full ring-2"
					style="left: {coord.x}%; bottom: {coord.height}%"
				></span>
			{/each}
		</div>
		<div class="flex">
			{#each points as point (point.key)}
				<div class="flex min-w-0 flex-1 flex-col items-center gap-2" title={point.title}>
					<span
						class={cn(
							'w-full truncate text-center text-xs tabular-nums',
							point.current ? 'text-foreground font-medium' : 'text-muted-foreground'
						)}
					>
						{point.text}
					</span>
					<span class="text-muted-foreground text-xs">{point.label}</span>
				</div>
			{/each}
		</div>
	</div>
{:else}
	<p class="text-muted-foreground py-12 text-center text-sm">{empty}</p>
{/if}
