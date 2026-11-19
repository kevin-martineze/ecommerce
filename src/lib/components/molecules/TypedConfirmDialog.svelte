<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import * as Dialog from '$lib/components/atoms/dialog';
	import { Input } from '$lib/components/atoms/input';
	import { Label } from '$lib/components/atoms/label';

	/**
	 * Confirmación de algo que no tiene vuelta atrás: el botón se habilita solo
	 * cuando se escribe `expected` (sin distinguir mayúsculas). El campo viaja
	 * en el form `form` con el nombre `name`, porque el servidor vuelve a
	 * comparar: el botón deshabilitado es una ayuda, no la regla.
	 */
	interface Props {
		open: boolean;
		title: string;
		description?: string;
		children?: Snippet;
		/** Id del <form> que el botón envía y al que pertenece el campo. */
		form: string;
		name: string;
		expected: string;
		/** Qué escribir, dicho para quien confirma: «Escribe el correo de la cuenta». */
		label: string;
		confirmLabel: string;
		pendingLabel?: string;
		pending?: boolean;
	}

	let {
		open = $bindable(false),
		title,
		description,
		children,
		form,
		name,
		expected,
		label,
		confirmLabel,
		pendingLabel = 'Eliminando…',
		pending = false
	}: Props = $props();

	let typed = $state('');

	const matches = $derived(typed.trim().toLowerCase() === expected.trim().toLowerCase());
	const inputId = $derived(`${form}-${name}`);
</script>

<Dialog.Root
	bind:open
	onOpenChange={(next) => {
		if (!next) typed = '';
	}}
>
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

		<div class="space-y-2">
			<Label for={inputId}>
				{label}: <span class="font-mono font-medium">{expected}</span>
			</Label>
			<Input
				id={inputId}
				{name}
				{form}
				bind:value={typed}
				autocomplete="off"
				autocapitalize="off"
				spellcheck={false}
			/>
		</div>

		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={() => (open = false)}>Cancelar</Button>
			<Button type="submit" {form} variant="destructive" disabled={!matches || pending}>
				{pending ? pendingLabel : confirmLabel}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
