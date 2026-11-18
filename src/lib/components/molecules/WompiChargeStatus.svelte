<script lang="ts">
	// Tipos
	import type { WompiCharge } from '$lib/utils/wompi-checkout.svelte';

	interface Props {
		charge: WompiCharge;
	}

	let { charge }: Props = $props();
</script>

{#if charge.confirming}
	<p class="text-muted-foreground text-center text-sm">Estamos confirmando tu pago…</p>
{:else if charge.isExpired}
	<p class="text-muted-foreground text-center text-sm">
		Tu pago está en proceso. Recarga esta página en unos minutos para ver si ya quedó confirmado.
	</p>
{:else if charge.rejected}
	<p class="text-destructive text-center text-sm">
		Tu pago no se aprobó. Puedes intentarlo de nuevo.
	</p>
{/if}
