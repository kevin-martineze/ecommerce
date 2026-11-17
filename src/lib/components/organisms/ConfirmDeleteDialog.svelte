<script lang="ts">
	import ConfirmDialog from '$lib/components/molecules/ConfirmDialog.svelte';

	/**
	 * El diálogo de confirmación de un borrado o de quitar algo: un ConfirmDialog
	 * destructivo, con «Borrar» por defecto. Envía el form cuyo id llega en `form`.
	 */
	interface Props {
		open: boolean;
		title: string;
		description?: string;
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

<ConfirmDialog
	bind:open
	{title}
	{description}
	{form}
	{pending}
	{confirmLabel}
	{pendingLabel}
	variant="destructive"
/>
