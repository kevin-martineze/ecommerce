<script lang="ts">
	import { Button } from '$lib/components/atoms/button';
	import * as Dialog from '$lib/components/atoms/dialog';

	/**
	 * Pide confirmación antes de un borrado o de quitar algo. El botón de
	 * confirmar envía el form cuyo id llega en `form`, desde fuera del diálogo.
	 */
	interface Props {
		open: boolean;
		title: string;
		description?: string;
		/** Id del <form> que el botón de confirmar envía. */
		form: string;
		pending?: boolean;
		confirmLabel?: string;
		pendingLabel?: string;
	}

	let {
		open = $bindable(false),
		title,
		description,
		form,
		pending = false,
		confirmLabel = 'Borrar',
		pendingLabel = 'Borrando…'
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

		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={() => (open = false)}>Cancelar</Button>
			<Button type="submit" {form} variant="destructive" disabled={pending}>
				{pending ? pendingLabel : confirmLabel}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
