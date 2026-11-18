<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';

	/**
	 * Una fila editable del panel, apilada como tarjeta: en desktop y en móvil.
	 *
	 * Sustituye a la tabla de inputs: con varias columnas de campos, la tabla se
	 * aplasta dentro de la mitad izquierda del editor y los inputs quedan de
	 * 40px. `children` son los campos y `acciones` los botones de la fila de abajo.
	 */
	interface Props {
		children: Snippet;
		actionList: Snippet;
	}

	let { children, actionList }: Props = $props();
</script>

<div class="border-border space-y-4 rounded-lg border p-4">
	{@render children()}

	<div class="border-border flex flex-wrap items-center justify-end gap-2 border-t pt-4">
		{@render actionList()}
	</div>
</div>
