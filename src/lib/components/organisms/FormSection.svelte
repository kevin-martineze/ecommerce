<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';

	// Componentes
	import * as Card from '$lib/components/atoms/card';

	/**
	 * Un bloque del panel con título: la tarjeta que cada página armaba a mano
	 * con `border bg-card rounded-lg p-6` y un `<h2>`.
	 */
	interface Props {
		title: string;
		description?: string;
		/** Acciones junto al título (un botón «Nuevo», un enlace). */
		actions?: Snippet;
		/** El pie: normalmente el botón de guardar. */
		footer?: Snippet;
		class?: string;
		children: Snippet;
	}

	let { title, description, actions, footer, class: className, children }: Props = $props();
</script>

<Card.Root class={className}>
	<Card.Header>
		<Card.Title class="text-lg">{title}</Card.Title>
		{#if description}
			<Card.Description>{description}</Card.Description>
		{/if}
		{#if actions}
			<Card.Action>{@render actions()}</Card.Action>
		{/if}
	</Card.Header>
	<Card.Content>
		{@render children()}
	</Card.Content>
	{#if footer}
		<Card.Footer class="justify-end gap-2">{@render footer()}</Card.Footer>
	{/if}
</Card.Root>
