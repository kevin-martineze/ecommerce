<!--
@component
Sección Marca: nombre, anuncio y logo.
-->
<script lang="ts">
	// Tipos
	import type { DeleteConfirm } from '$lib/utils/delete-confirm.svelte';
	import type { DesignEditor } from './design-editor.svelte';

	// Iconos
	import Trash2 from '@lucide/svelte/icons/trash-2';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { Badge } from '$lib/components/atoms/badge';
	import { Button } from '$lib/components/atoms/button';
	import { Input } from '$lib/components/atoms/input';
	import { Label } from '$lib/components/atoms/label';
	import { Textarea } from '$lib/components/atoms/textarea';

	interface Props {
		editor: DesignEditor;
		/** El logo guardado. Se sube y se quita al instante, fuera del borrador. */
		logoUrl: string | null;
		deletion: DeleteConfirm;
	}

	let { editor, logoUrl, deletion }: Props = $props();
</script>

<div class="space-y-6 p-5">
	<div class="space-y-2">
		<Label for="storeName">Nombre de la tienda</Label>
		<Input id="storeName" bind:value={editor.values.storeName} required maxlength={80} />
	</div>

	<div class="space-y-2">
		<Label for="announcement">Barra de anuncio</Label>
		<Textarea
			id="announcement"
			rows={2}
			maxlength={160}
			bind:value={editor.values.announcement}
			placeholder="Envío gratis por compras sobre $250.000"
		/>
		<p class="text-muted-foreground text-xs">Déjalo vacío para ocultar la barra.</p>
	</div>

	<div class="border-border space-y-3 border-t pt-5">
		<div class="flex items-center justify-between gap-2">
			<h2 class="text-sm font-semibold">Logo</h2>
			<Badge variant="outline">Se guarda al instante</Badge>
		</div>
		<p class="text-muted-foreground text-xs">
			Si subes un logo, la tienda lo muestra en vez del nombre: en la cabecera, en el menú y en el
			pie.
		</p>

		{#if logoUrl}
			<div class="grid place-items-center rounded-md bg-white p-4">
				<img
					src={logoUrl}
					alt={editor.saved.storeName}
					class="h-16 w-auto max-w-full object-contain"
				/>
			</div>
		{:else}
			<p class="text-muted-foreground text-sm">
				Todavía no tienes logo: la tienda muestra el nombre.
			</p>
		{/if}

		<form
			method="POST"
			action="?/uploadLogo"
			enctype="multipart/form-data"
			class="space-y-3"
			use:enhance
		>
			<Label for="logo">Archivo del logo</Label>
			<Input
				id="logo"
				name="file"
				type="file"
				accept="image/png,image/jpeg,image/webp,image/svg+xml"
				required
			/>
			<p class="text-muted-foreground text-xs">
				Mejor en PNG o SVG con fondo transparente, horizontal. Máximo 2 MB.
			</p>
			<Button type="submit" size="sm">Subir logo</Button>
		</form>

		{#if logoUrl}
			<Button
				type="button"
				variant="ghost"
				size="sm"
				class="text-destructive"
				onclick={() =>
					deletion.ask('remove-logo', '¿Quitar el logo?', {
						description: 'La tienda vuelve a mostrar el nombre.',
						confirmLabel: 'Quitar',
						pendingLabel: 'Quitando…'
					})}
			>
				<Trash2 class="size-3" />
				Quitar logo
			</Button>
		{/if}
	</div>
</div>
