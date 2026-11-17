<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import * as Dialog from '$lib/components/atoms/dialog';

	/**
	 * Un diálogo de confirmación. Confirma enviando un form (`form`, por id) o
	 * ejecutando `onconfirm`. El contenido va en `description` o en el snippet
	 * de los hijos, para listas o textos más largos.
	 */
	interface Props {
		open: boolean;
		title: string;
		description?: string;
		children?: Snippet;
		confirmLabel: string;
		cancelLabel?: string;
		pendingLabel?: string;
		variant?: 'default' | 'destructive';
		/** Id del <form> que el botón de confirmar envía. */
		form?: string;
		/** Qué hacer al confirmar, si no se envía un form. */
		onconfirm?: () => void;
		pending?: boolean;
	}

	let {
		open = $bindable(false),
		title,
		description,
		children,
		confirmLabel,
		cancelLabel = 'Cancelar',
		pendingLabel = 'Guardando…',
		variant = 'default',
		form,
		onconfirm,
		pending = false
	}: Props = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			{#if description}
				<Dialog.Description>{description}</Dialog.Description>
			{/if}
		</Dialog.Header>

		{#if children}
			{@render children()}
		{/if}

		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={() => (open = false)}>{cancelLabel}</Button>
			{#if form}
				<Button type="submit" {form} {variant} disabled={pending}>
					{pending ? pendingLabel : confirmLabel}
				</Button>
			{:else}
				<Button type="button" {variant} disabled={pending} onclick={() => onconfirm?.()}>
					{pending ? pendingLabel : confirmLabel}
				</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
