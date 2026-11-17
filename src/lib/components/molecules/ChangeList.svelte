<script lang="ts">
	// Tipos
	import type { DesignChange, ModoCambios } from '$lib/domain/design-changes';

	// Iconos
	import Minus from '@lucide/svelte/icons/minus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Plus from '@lucide/svelte/icons/plus';

	// Dominio
	import { textoDelCambio } from '$lib/domain/design-changes';

	// Utilidades
	import { cn } from '$lib/utils';

	/**
	 * La lista de cambios de Diseño, agrupada por sección. Cada cambio lleva su
	 * icono por tipo; los que se notan mucho (plantilla, colección) van destacados.
	 */
	interface Props {
		cambios: DesignChange[];
		modo?: ModoCambios;
	}

	let { cambios, modo = 'guardar' }: Props = $props();

	const SECCIONES = [
		{ id: 'estilo', label: 'Estilo' },
		{ id: 'marca', label: 'Marca' },
		{ id: 'portada', label: 'Portada' }
	] as const;

	const grupos = $derived(
		SECCIONES.map((seccion) => ({
			...seccion,
			items: cambios.filter((cambio) => cambio.seccion === seccion.id)
		})).filter((grupo) => grupo.items.length > 0)
	);
</script>

<div class="max-h-[50vh] space-y-4 overflow-y-auto">
	{#each grupos as grupo (grupo.id)}
		<section class="space-y-2">
			<h3 class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
				{grupo.label}
			</h3>

			<ul class="space-y-2">
				{#each grupo.items as cambio, indice (`${grupo.id}-${indice}`)}
					<li class={cn('flex items-start gap-2 text-sm', cambio.destacado && 'font-semibold')}>
						{#if cambio.tipo === 'agrega'}
							<Plus class="text-success mt-0.5 size-4 flex-none" />
						{:else if cambio.tipo === 'quita'}
							<Minus class="text-muted-foreground mt-0.5 size-4 flex-none" />
						{:else}
							<Pencil class="text-muted-foreground mt-0.5 size-4 flex-none" />
						{/if}

						<span class="min-w-0 flex-1">{textoDelCambio(cambio, modo)}</span>

						{#if cambio.swatch}
							<span
								class="border-border mt-1 block size-3.5 flex-none rounded-full border"
								style="background-color: {cambio.swatch}"
								aria-hidden="true"
							></span>
						{/if}

						{#if cambio.destacado}
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
