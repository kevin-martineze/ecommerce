<!--
@component
Computador o celular: en qué pantalla se ve la vista previa de la tienda.
-->
<script lang="ts">
	// Tipos
	import type { PreviewDevice } from '$lib/domain/preview';

	// Iconos
	import Monitor from '@lucide/svelte/icons/monitor';
	import Smartphone from '@lucide/svelte/icons/smartphone';

	// Componentes
	import SegmentedControl from '$lib/components/molecules/SegmentedControl.svelte';

	interface Props {
		value: PreviewDevice;
	}

	let { value = $bindable() }: Props = $props();

	const OPTIONS: { value: PreviewDevice; label: string; icon: typeof Monitor }[] = [
		{ value: 'desktop', label: 'Ver en computador', icon: Monitor },
		{ value: 'mobile', label: 'Ver en celular', icon: Smartphone }
	];
</script>

<SegmentedControl options={OPTIONS} bind:value label="Pantalla" />
