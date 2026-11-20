<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	// Componentes
	import PlatformTemplate from '$lib/components/templates/PlatformTemplate.svelte';

	interface Props {
		data: LayoutData;
		children: Snippet;
	}

	let { data, children }: Props = $props();
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
	<!-- Instalable desde el celular: en iPhone es lo que habilita el push. -->
	<link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>

<PlatformTemplate
	email={data.adminEmail}
	hasStores={data.hasStores}
	notifications={data.notifications}
>
	{@render children()}
</PlatformTemplate>
