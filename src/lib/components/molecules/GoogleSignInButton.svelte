<script lang="ts">
	// Componentes
	import { Button } from '$lib/components/atoms/button';

	// Recursos
	import googleG from '$lib/assets/google-g.svg';

	/**
	 * Entrar o registrarse con Google.
	 *
	 * Es un enlace y no un botón con JavaScript: el flujo entero pasa por el
	 * servidor (`/auth/google`), así que funciona sin hidratar y no carga
	 * ningún script de Google en la página.
	 *
	 * El logo es el SVG oficial de la "G", no un icono de lucide: las guías de
	 * marca de Google lo exigen en el botón y lucide no trae iconos de marca.
	 * Es la única excepción a la regla 24 (ver `docs/plan-google-login.md`).
	 */
	interface Props {
		href: string;
		label?: string;
	}

	let { href, label = 'Continuar con Google' }: Props = $props();
</script>

<Button {href} variant="outline" class="w-full gap-3">
	<img src={googleG} alt="" class="size-4.5" aria-hidden="true" />
	{label}
</Button>
