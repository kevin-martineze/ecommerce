<script lang="ts">
	// Utilidades
	import { cn } from '$lib/utils';

	interface Bar {
		key: string;
		label: string;
		value: number;
		/** Lo que se lee sobre la barra. */
		text: string;
		/** Lo que aparece al pasar el cursor. */
		title: string;
		/** Resalta la barra (el mes en curso). */
		current: boolean;
	}

	interface Props {
		/** Nombre accesible de la gráfica. */
		label: string;
		bars: Bar[];
		/** Qué decir cuando todas las barras están en cero. */
		empty: string;
	}

	let { label, bars, empty }: Props = $props();

	/** La barra más alta marca el 100% de la altura. */
	const top = $derived(Math.max(1, ...bars.map((bar) => bar.value)));
	const hasData = $derived(bars.some((bar) => bar.value > 0));
</script>

{#if hasData}
	<ul class="flex gap-2 sm:gap-3" aria-label={label}>
		{#each bars as bar (bar.key)}
			<li class="flex min-w-0 flex-1 flex-col items-center gap-2" title={bar.title}>
				<span class="text-muted-foreground w-full truncate text-center text-xs tabular-nums">
					{bar.text}
				</span>
				<span class="border-border flex h-32 w-full items-end border-b">
					<span
						class={cn('block w-full rounded-t', bar.current ? 'bg-primary' : 'bg-primary/40')}
						style="height: {(bar.value / top) * 100}%"
					></span>
				</span>
				<span class="text-muted-foreground text-xs">{bar.label}</span>
			</li>
		{/each}
	</ul>
{:else}
	<p class="text-muted-foreground py-12 text-center text-sm">{empty}</p>
{/if}
