<!--
@component
En el celular la tienda no cabe al lado del formulario: un botón la abre en
una hoja a pantalla casi completa.
-->
<script lang="ts">
	// Tipos
	import type { StorefrontDraft } from '$lib/domain/preview';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import * as Sheet from '$lib/components/atoms/sheet';
	import DraftPreview from '$lib/components/molecules/DraftPreview.svelte';

	interface Props {
		src: string;
		draft: StorefrontDraft;
		title: string;
	}

	let { src, draft, title }: Props = $props();

	let open = $state(false);
</script>

<Button
	type="button"
	class="fixed inset-x-4 bottom-4 z-30 shadow-lg lg:hidden"
	size="lg"
	onclick={() => (open = true)}
>
	Ver cómo queda
</Button>

<Sheet.Root bind:open>
	<Sheet.Content side="bottom" class="h-[90dvh]">
		<Sheet.Header>
			<Sheet.Title>{title}</Sheet.Title>
		</Sheet.Header>

		<div class="min-h-0 flex-1 px-4 pb-4">
			<DraftPreview {src} {draft} device="mobile" {title} />
		</div>
	</Sheet.Content>
</Sheet.Root>
