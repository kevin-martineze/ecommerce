<script lang="ts">
	// Tipos
	import type { ModuleName } from '$lib/components/molecules/ModuleIcon.svelte';

	// Componentes
	import ModuleIcon from '$lib/components/molecules/ModuleIcon.svelte';
	import ModulePreview from '$lib/components/molecules/ModulePreview.svelte';

	// Utilidades
	import { cn } from '$lib/utils';
	import { formatMoney } from '$lib/utils/money';

	/**
	 * El bento de «Todo lo que hoy llevas en cuadernos»: la cifra `$0` en
	 * grande y, al lado, cada módulo con su mini-vista del panel.
	 *
	 * - Escritorio (`lg`): tres columnas; la cifra ocupa la primera, alta de
	 *   dos filas, y los cuatro módulos van en 2×2 a su derecha.
	 * - Tableta (`sm`–`md`): la cifra a lo ancho arriba y los módulos en 2×2.
	 * - Celular: una fila horizontal con `scroll-snap`, sin flechas ni
	 *   puntos; asoma la tarjeta siguiente para que se note que hay más.
	 *
	 * El desbordamiento vive aquí y no en la página. En celular la fila sangra
	 * hasta el borde de la pantalla (`-mx-4`, lo que mide el margen de la
	 * sección) y desde `sm` vuelve a su ancho.
	 *
	 * La raíz lleva `data-reveal-group`: dentro de un bloque `data-reveal`,
	 * las tarjetas entran una a una (`SmoothScroll`).
	 */
	interface Props {
		modulos: { modulo: ModuleName; title: string; detail: string }[];
	}

	let { modulos }: Props = $props();

	/** Una venta de ejemplo: lo que se cobra y lo que te queda, igual. */
	const sale = 89900;

	const receipt = [
		{ label: 'Venta', value: formatMoney(sale), total: false },
		{ label: 'Comisión', value: formatMoney(0), total: false },
		{ label: 'Recibes', value: formatMoney(sale), total: true }
	];
</script>

<ul
	class="mt-10 -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3"
	data-reveal-group
>
	<li
		class="bg-primary text-primary-foreground flex w-4/5 shrink-0 snap-start flex-col justify-between gap-8 rounded-lg p-6 sm:col-span-2 sm:w-auto sm:flex-row sm:items-end lg:col-span-1 lg:row-span-2 lg:flex-col lg:items-stretch"
	>
		<div>
			<p class="text-6xl font-semibold tabular-nums">$0</p>
			<p class="mt-3 text-sm font-medium text-pretty">
				de comisión por venta. Lo que vendas es tuyo.
			</p>
		</div>

		<!-- El recibo es de adorno: la cifra de arriba ya lo dice. -->
		<div
			aria-hidden="true"
			class="border-primary-foreground/25 bg-primary-foreground/10 rounded-lg border p-4 text-sm select-none sm:w-72 lg:w-auto"
		>
			{#each receipt as row (row.label)}
				<div
					class={cn(
						'flex items-center justify-between py-1',
						row.total && 'border-primary-foreground/25 mt-1 border-t pt-2 font-semibold'
					)}
				>
					<span>{row.label}</span>
					<span class="tabular-nums">{row.value}</span>
				</div>
			{/each}
		</div>
	</li>

	{#each modulos as item (item.modulo)}
		<li class="bg-secondary flex w-4/5 shrink-0 snap-start flex-col gap-6 rounded-lg p-6 sm:w-auto">
			<ModulePreview name={item.modulo} class="h-44" />
			<div>
				<div class="flex items-center gap-3">
					<ModuleIcon name={item.modulo} class="size-9 [&_svg]:size-9" />
					<h3 class="text-lg font-semibold">{item.title}</h3>
				</div>
				<p class="text-muted-foreground mt-2 text-sm text-pretty">{item.detail}</p>
			</div>
		</li>
	{/each}
</ul>
