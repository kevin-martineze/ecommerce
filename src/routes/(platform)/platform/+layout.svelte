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
</svelte:head>

<PlatformTemplate email={data.adminEmail} hasStores={data.hasStores}>
	{@render children()}
</PlatformTemplate>
