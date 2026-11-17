<script lang="ts">
	// Tipos
	import type { DesignChange, ChangesMode } from '$lib/domain/design-changes';

	// Iconos
	import Minus from '@lucide/svelte/icons/minus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Plus from '@lucide/svelte/icons/plus';

	// Dominio
	import { changeText } from '$lib/domain/design-changes';

	// Utilidades
	import { cn } from '$lib/utils';

	/**
	 * La lista de cambios de Diseño, agrupada por sección. Cada cambio lleva su
	 * icono por tipo; los que se notan mucho (plantilla, colección) van destacados.
	 */
	interface Props {
		changes: DesignChange[];
		mode?: ChangesMode;
	}

	let { changes, mode = 'save' }: Props = $props();

	const SECTIONS = [
		{ id: 'style', label: 'Estilo' },
		{ id: 'brand', label: 'Marca' },
		{ id: 'cover', label: 'Portada' }
	] as const;

	const groups = $derived(
		SECTIONS.map((section) => ({
			...section,
			items: changes.filter((change) => change.section === section.id)
		})).filter((group) => group.items.length > 0)
	);
</script>

<div class="max-h-[50vh] space-y-4 overflow-y-auto">
	{#each groups as group (group.id)}
		<section class="space-y-2">
			<h3 class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
				{group.label}
			</h3>

			<ul class="space-y-2">
				{#each group.items as change, index (`${group.id}-${index}`)}
					<li class={cn('flex items-start gap-2 text-sm', change.featured && 'font-semibold')}>
						{#if change.kind === 'add'}
							<Plus class="text-success mt-0.5 size-4 flex-none" />
						{:else if change.kind === 'remove'}
							<Minus class="text-muted-foreground mt-0.5 size-4 flex-none" />
						{:else}
							<Pencil class="text-muted-foreground mt-0.5 size-4 flex-none" />
						{/if}

						<span class="min-w-0 flex-1">{changeText(change, mode)}</span>

						{#if change.swatch}
							<span
								class="border-border mt-1 block size-3.5 flex-none rounded-full border"
								style="background-color: {change.swatch}"
								aria-hidden="true"
							></span>
						{/if}

						{#if change.featured}
							<span class="bg-muted text-foreground flex-none rounded px-1.5 text-xs">
								Se nota mucho
							</span>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>
