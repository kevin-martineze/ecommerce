<!--
@component
Sección Estilo: plantilla, color, letras, esquinas y portada en plantilla.
-->
<script lang="ts">
	// Tipos
	import type { DesignEditor } from './design-editor.svelte';

	// Iconos
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import ThemeControls from '$lib/components/organisms/ThemeControls.svelte';

	// Dominio
	import { isEmptyTheme } from '$lib/domain/theme';

	interface Props {
		editor: DesignEditor;
	}

	let { editor }: Props = $props();
</script>

<ThemeControls
	bind:template={editor.values.template}
	bind:accent={editor.values.accent}
	bind:fonts={editor.values.fonts}
	bind:corners={editor.values.corners}
	bind:hero={editor.values.hero}
/>

<div class="border-border border-t p-5">
	<Button
		type="button"
		variant="ghost"
		size="sm"
		class="text-muted-foreground"
		disabled={isEmptyTheme(editor.draft.theme)}
		onclick={() => editor.clearAdjustments()}
	>
		<RotateCcw />
		Quitar mis ajustes
	</Button>
	<p class="text-muted-foreground mt-1 px-3 text-xs">
		Deja la plantilla como viene. Se aplica al guardar.
	</p>
</div>
