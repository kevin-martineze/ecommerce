<!--
@component
La barra de anuncio de la tienda: «Envío gratis por compras sobre…».

Las copias ocultas existen para la plantilla que la desliza (Maison): con el
texto repetido, la franja se mueve en bucle sin dejar huecos. Las demás
plantillas solo muestran la primera, centrada.
-->
<script lang="ts">
	interface Props {
		text: string;
		/** Dentro del editor de Diseño: marca la zona para resaltarla. */
		draftPreview?: boolean;
	}

	let { text, draftPreview = false }: Props = $props();

	/** Siete copias más el original: dos mitades iguales para el bucle. */
	const COPIES = [1, 2, 3, 4, 5, 6, 7];
</script>

<div
	class="announcement bg-primary text-primary-foreground overflow-hidden px-4 py-2 text-center text-xs tracking-wide"
	data-preview-zone={draftPreview ? 'announcement' : undefined}
>
	<div class="announcement-track">
		<span class="announcement-item">{text}</span>
		{#each COPIES as copy (copy)}
			<span class="announcement-item announcement-copy hidden" aria-hidden="true">{text}</span>
		{/each}
	</div>
</div>
