<!--
@component
La tienda de verdad al lado del formulario, con el cambio de pantalla. Va en
la columna lateral de `PreviewTemplate`, que la deja pegada mientras se
recorre el formulario.
-->
<script lang="ts">
	// Tipos
	import type { PreviewDevice, StorefrontDraft } from '$lib/domain/preview';

	// Componentes
	import DeviceToggle from '$lib/components/molecules/DeviceToggle.svelte';
	import DraftPreview from '$lib/components/molecules/DraftPreview.svelte';

	interface Props {
		src: string;
		draft: StorefrontDraft;
		title: string;
	}

	let { src, draft, title }: Props = $props();

	let device = $state<PreviewDevice>('desktop');
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between gap-3">
		<p class="text-muted-foreground text-xs">Así se ve tu tienda</p>
		<DeviceToggle bind:value={device} />
	</div>

	<div class="bg-muted/60 h-[calc(100dvh-10rem)] min-h-[32rem] overflow-hidden rounded-lg p-3">
		<DraftPreview {src} {draft} {device} {title} />
	</div>
</div>
