<script lang="ts">
	// Iconos
	import Check from '@lucide/svelte/icons/check';

	// Utilidades
	import { cn } from '$lib/utils';

	/**
	 * Dónde va y cuánto falta.
	 *
	 * Los pasos ya hechos son botones: quien se equivocó al escribir su correo
	 * quiere volver, no empezar de nuevo. Los que aún no toca no se pueden
	 * saltar, porque cada paso valida lo suyo antes de dejar pasar.
	 */
	interface Props {
		steps: string[];
		/** Índice del paso en curso, desde 0. */
		actual: number;
		ongo?: (index: number) => void;
	}

	let { steps, actual, ongo }: Props = $props();
</script>

<ol class="flex items-center" aria-label="Progreso del registro">
	{#each steps as title, index (title)}
		{@const done = index < actual}
		{@const isActive = index === actual}

		<li class={cn('flex items-center', index < steps.length - 1 && 'flex-1')}>
			<button
				type="button"
				disabled={!done}
				onclick={() => ongo?.(index)}
				aria-current={isActive ? 'step' : undefined}
				class={cn(
					'flex items-center gap-2 rounded-md text-sm',
					done && 'cursor-pointer',
					!isActive && !done && 'text-muted-foreground'
				)}
			>
				<span
					class={cn(
						'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums transition-colors',
						isActive && 'border-foreground bg-foreground text-background',
						done && 'border-foreground text-foreground',
						!isActive && !done && 'border-border'
					)}
				>
					{#if done}
						<Check class="size-3.5" />
					{:else}
						{index + 1}
					{/if}
				</span>

				<!-- El rótulo se esconde en pantallas angostas: el número y la línea
				     ya dicen dónde va, y tres rótulos completos no caben. -->
				<span class={cn('hidden sm:inline', isActive && 'font-medium')}>{title}</span>
			</button>

			{#if index < steps.length - 1}
				<span class={cn('mx-3 h-px flex-1 transition-colors', done ? 'bg-foreground' : 'bg-border')}
				></span>
			{/if}
		</li>
	{/each}
</ol>
