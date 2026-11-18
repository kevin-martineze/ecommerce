<!--
@component
La barra de anuncio de la tienda: «Envío gratis por compras sobre…».
-->
<script lang="ts">
	interface Props {
		text: string;
		/** Dentro del editor de Diseño: marca la zona para resaltarla. */
		draftPreview?: boolean;
	}

	let { text, draftPreview = false }: Props = $props();
</script>

<div
	class="bg-primary text-primary-foreground px-4 py-2 text-center text-xs tracking-wide"
	data-preview-zone={draftPreview ? 'announcement' : undefined}
>
	{text}
</div>
