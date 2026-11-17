<script lang="ts">
	// Tipos
	import type { StorefrontTemplate } from '$lib/domain/templates';

	// Iconos
	import Check from '@lucide/svelte/icons/check';
	import ExternalLink from '@lucide/svelte/icons/external-link';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import StorefrontFrame from '$lib/components/molecules/StorefrontFrame.svelte';

	// Estado
	import { FormState } from '$lib/utils/form-state.svelte';

	// Dominio
	import { TEMPLATES } from '$lib/domain/templates';

	// Utilidades
	import { previewUrl } from '$lib/template-preview';
	import { cn } from '$lib/utils';

	/**
	 * Elegir con qué plantilla se viste la tienda.
	 *
	 * Cada opción enseña la tienda de verdad —sus productos, sus textos— ya
	 * vestida con esa plantilla, en miniatura, y «Ver en mi tienda» la abre a
	 * tamaño real en una pestaña aparte para recorrerla. Nada de eso la
	 * cambia: la cambia el botón de abajo, que es un `<form>` propio por
	 * opción y funciona igual sin JavaScript. La que ya está puesta no se
	 * vuelve a enviar y se marca como la actual.
	 */
	interface Props {
		/** La plantilla que tiene la tienda hoy. */
		current: StorefrontTemplate;
		/** La dirección pública de la tienda, para las miniaturas y la vista previa. */
		storeUrl: string;
		/** Action del form, p. ej. `?/template`. */
		action: string;
		/** Texto del botón de cada opción. */
		cta?: string;
	}

	let { current, storeUrl, action, cta = 'Usar esta plantilla' }: Props = $props();

	const submission = new FormState();
	/** La plantilla que se está aplicando, para poner «Aplicando…» solo en su botón. */
	let applying = $state('');
</script>

<div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
	{#each TEMPLATES as template (template.code)}
		{@const selected = template.code === current}

		<div
			class={cn(
				'border-border bg-card flex flex-col rounded-lg border p-5 transition-colors',
				selected && 'border-foreground'
			)}
		>
			<div class="mb-4 flex items-center justify-between gap-3">
				<h3 class="text-xl">{template.name}</h3>
				{#if selected}
					<span class="text-muted-foreground flex items-center gap-1.5 text-xs">
						<Check class="size-4" />
						La que usas
					</span>
				{/if}
			</div>

			<StorefrontFrame
				src={previewUrl(storeUrl, template.code, true)}
				title="Tu tienda con la plantilla {template.name}"
			/>

			<a
				href={previewUrl(storeUrl, template.code)}
				target="_blank"
				rel="noopener"
				class="text-muted-foreground hover:text-foreground mt-3 inline-flex items-center gap-1.5 self-start text-sm underline-offset-4 hover:underline"
			>
				Ver en mi tienda
				<ExternalLink class="size-3.5" />
			</a>

			<p class="text-muted-foreground mt-4 text-sm">{template.tagline}</p>

			<ul class="text-muted-foreground mt-3 space-y-1.5 text-sm">
				{#each template.features as feature (feature)}
					<li class="flex items-start gap-2">
						<Check class="mt-0.5 size-3.5 flex-none" />
						<span>{feature}</span>
					</li>
				{/each}
			</ul>

			<form
				method="POST"
				{action}
				class="mt-auto pt-5"
				use:enhance={submission.submit({ prepare: () => (applying = template.code) })}
			>
				<input type="hidden" name="template" value={template.code} />
				<Button
					type="submit"
					class="w-full"
					variant={selected ? 'outline' : 'default'}
					disabled={selected || submission.pending}
				>
					{#if submission.pending && applying === template.code}
						Aplicando…
					{:else if selected}
						En uso
					{:else}
						{cta}
					{/if}
				</Button>
			</form>
		</div>
	{/each}
</div>
