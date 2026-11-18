<!--
@component
«Saltar al contenido»: invisible hasta que llega el foco con el teclado.
-->
<script lang="ts">
	interface Props {
		/** El id del `main`. */
		target: string;
	}

	let { target }: Props = $props();
</script>

<a
	href="#{target}"
	class="bg-background text-foreground focus-visible:ring-ring sr-only z-50 rounded-md px-3 py-2 text-sm shadow focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus-visible:ring-2"
>
	Saltar al contenido
</a>
