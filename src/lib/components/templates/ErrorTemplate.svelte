<!--
@component
Una página de error (404, 500): `AuthLayout` centrado, con el código arriba
y las salidas abajo. La página pone el título, el texto y a dónde ir.
-->
<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';

	// Componentes
	import AuthLayout from '$lib/components/layouts/AuthLayout.svelte';

	interface Props {
		status: number;
		title: string;
		message: string;
		/** Las salidas: al inicio, a la tienda. */
		actions: Snippet;
	}

	let { status, title, message, actions }: Props = $props();
</script>

<AuthLayout width="medium" class="text-center">
	{#snippet header()}
		<p class="eyebrow">Error {status}</p>
		<h1 class="text-4xl md:text-5xl">{title}</h1>
	{/snippet}

	<div class="space-y-6">
		<p class="text-muted-foreground mx-auto max-w-md text-balance">{message}</p>

		<div class="flex flex-wrap justify-center gap-3">
			{@render actions()}
		</div>
	</div>
</AuthLayout>
