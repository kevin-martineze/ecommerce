<!--
@component
La barra de arriba del editor de Diseño: salir, página y pantalla de la vista
previa, y Descartar / Guardar.
-->
<script lang="ts">
	// Tipos
	import type { DesignEditor } from './design-editor.svelte';

	// Iconos
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Smartphone from '@lucide/svelte/icons/smartphone';

	// Componentes
	import { Button } from '$lib/components/atoms/button';

	// Estado
	import { PREVIEW_PAGES } from './design-editor.svelte';

	// Utilidades
	import { cn } from '$lib/utils';

	interface Props {
		editor: DesignEditor;
		storeName: string;
		/** La dirección pública, para «Ver mi tienda». */
		storeUrl: string;
	}

	let { editor, storeName, storeUrl }: Props = $props();
</script>

<header
	class="border-border flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2.5 lg:flex-nowrap"
>
	<Button href="/admin" variant="ghost" size="sm">
		<ArrowLeft />
		Salir
	</Button>

	<div class="min-w-0">
		<h1 class="truncate text-base">Diseño de tu tienda</h1>
		<p class="text-muted-foreground truncate text-xs">
			{storeName}
			{#if editor.changed}· <span class="text-foreground">Cambios sin guardar</span>{/if}
		</p>
	</div>

	<div class="ml-auto flex items-center gap-1">
		<div class="bg-muted flex rounded-md p-0.5" role="group" aria-label="Página que ves">
			{#each PREVIEW_PAGES as option (option.path)}
				<button
					type="button"
					class={cn(
						'rounded px-2.5 py-1 text-xs transition-colors',
						editor.path === option.path
							? 'bg-background text-foreground shadow-xs'
							: 'text-muted-foreground hover:text-foreground'
					)}
					aria-pressed={editor.path === option.path}
					onclick={() => (editor.path = option.path)}
				>
					{option.label}
				</button>
			{/each}
		</div>

		<div class="bg-muted flex rounded-md p-0.5" role="group" aria-label="Pantalla">
			<button
				type="button"
				class={cn(
					'rounded p-1.5 transition-colors',
					editor.device === 'desktop'
						? 'bg-background text-foreground shadow-xs'
						: 'text-muted-foreground hover:text-foreground'
				)}
				aria-pressed={editor.device === 'desktop'}
				aria-label="Ver en computador"
				title="Computador"
				onclick={() => (editor.device = 'desktop')}
			>
				<Monitor class="size-4" />
			</button>
			<button
				type="button"
				class={cn(
					'rounded p-1.5 transition-colors',
					editor.device === 'mobile'
						? 'bg-background text-foreground shadow-xs'
						: 'text-muted-foreground hover:text-foreground'
				)}
				aria-pressed={editor.device === 'mobile'}
				aria-label="Ver en celular"
				title="Celular"
				onclick={() => (editor.device = 'mobile')}
			>
				<Smartphone class="size-4" />
			</button>
		</div>
	</div>

	<div class="flex items-center gap-2">
		<Button href={storeUrl} target="_blank" rel="noopener" variant="ghost" size="sm">
			Ver mi tienda
			<ExternalLink />
		</Button>
		<Button
			type="button"
			variant="outline"
			size="sm"
			disabled={!editor.changed || editor.saving}
			onclick={() => (editor.discardDialogOpen = true)}
		>
			Descartar
		</Button>
		<Button
			type="button"
			size="sm"
			disabled={!editor.changed || editor.invalid || editor.saving}
			onclick={() => (editor.saveDialogOpen = true)}
		>
			{editor.saving ? 'Guardando…' : 'Guardar'}
		</Button>
	</div>
</header>
