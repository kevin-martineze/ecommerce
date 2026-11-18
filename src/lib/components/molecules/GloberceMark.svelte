<script lang="ts">
	// Recursos
	import logo from '$lib/assets/logo.png';

	/**
	 * El isotipo de Globerce: la G blanca en relieve abrazando la esfera teal.
	 *
	 * Es un render 3D y no un SVG: el volumen y la luz no se pueden dibujar en
	 * vector. Eso tiene dos consecuencias que conviene conocer:
	 *
	 * - Se guarda a 512 px, con fondo transparente, y se muestra siempre más
	 *   chico, para que en pantallas densas siga viéndose nítido. Pedirlo más
	 *   grande que eso lo despinta.
	 * - Aguanta hasta 16 px porque la silueta es un círculo macizo: la G y la
	 *   esfera siguen leyéndose aunque se pierda el relieve.
	 *
	 * El original, a 2048 px y sin fondo, es el que se reduce para cada tamaño.
	 * Nunca se agranda una versión chica.
	 *
	 * El archivo lo importa Vite y no vive en `static/`: así viaja con su huella
	 * en el nombre y el navegador puede guardarlo para siempre. Lo que sí está
	 * en `static/` es lo que necesita una dirección fija —favicon, icono de iOS
	 * y la imagen para compartir—, y todo sale de este mismo dibujo.
	 */
	interface Props {
		/** Lado en px. El dibujo es cuadrado y lleva su propio aire. */
		size?: number;
		/** Texto para lectores de pantalla. Vacío si va junto al nombre escrito. */
		label?: string;
		class?: string;
	}

	let { size = 32, label = 'Globerce', class: className }: Props = $props();
</script>

<img
	src={logo}
	width={size}
	height={size}
	alt={label}
	class={className}
	decoding="async"
	draggable="false"
/>
