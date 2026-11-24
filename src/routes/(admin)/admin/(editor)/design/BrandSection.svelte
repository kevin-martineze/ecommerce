<!--
@component
Sección Marca: nombre, anuncio, logo e ícono.
-->
<script lang="ts">
	// Tipos
	import type { SubmitFunction } from '@sveltejs/kit';
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
		/** El ícono guardado (favicon). También al instante. */
		iconUrl: string | null;
		deletion: DeleteConfirm;
	}

	let { editor, logoUrl, iconUrl, deletion }: Props = $props();

	let uploadingIcon = $state(false);

	const onIconUpload: SubmitFunction = () => {
		uploadingIcon = true;

		return async ({ update }) => {
			await update();
			uploadingIcon = false;
		};
	};
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

	<div class="border-border space-y-3 border-t pt-5">
		<div class="flex items-center justify-between gap-2">
			<h2 class="text-sm font-semibold">Ícono</h2>
			<Badge variant="outline">Se guarda al instante</Badge>
		</div>
		<p class="text-muted-foreground text-xs">
			Sale en la pestaña del navegador y en el celular cuando guardan tu tienda. Usa algo que se lea
			chiquito, como tu inicial o tu símbolo. Si no subes uno, se usa el logo.
		</p>

		{#if iconUrl}
			<div class="bg-muted flex items-center gap-4 rounded-md p-4">
				<img src={iconUrl} alt="" class="size-16 rounded-md" />
				<div class="bg-background flex items-center gap-2 rounded-md px-3 py-2 text-xs shadow-sm">
					<img src={iconUrl} alt="" class="size-4" />
					<span class="max-w-32 truncate">{editor.saved.storeName}</span>
				</div>
			</div>
		{:else}
			<p class="text-muted-foreground text-sm">
				Todavía no tienes ícono: la pestaña usa {logoUrl ? 'tu logo' : 'tu inicial'}.
			</p>
		{/if}

		<form
			method="POST"
			action="?/uploadIcon"
			enctype="multipart/form-data"
			class="space-y-3"
			use:enhance={onIconUpload}
		>
			<Label for="icon">Archivo del ícono</Label>
			<Input
				id="icon"
				name="file"
				type="file"
				accept="image/png,image/jpeg,image/webp,image/svg+xml"
				required
			/>
			<p class="text-muted-foreground text-xs">
				Cuadrado, de al menos 512 × 512 px. PNG o SVG, máximo 2 MB.
			</p>
			<Button type="submit" size="sm" disabled={uploadingIcon}>
				{uploadingIcon ? 'Subiendo…' : 'Subir ícono'}
			</Button>
		</form>

		{#if iconUrl}
			<Button
				type="button"
				variant="ghost"
				size="sm"
				class="text-destructive"
				onclick={() =>
					deletion.ask('remove-icon', '¿Quitar el ícono?', {
						description: 'La pestaña vuelve a usar el logo.',
						confirmLabel: 'Quitar',
						pendingLabel: 'Quitando…'
					})}
			>
				<Trash2 class="size-3" />
				Quitar ícono
			</Button>
		{/if}
	</div>
</div>
