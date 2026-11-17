<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	// Componentes
	import AdminTemplate from '$lib/components/templates/AdminTemplate.svelte';

	interface Props {
		data: LayoutData;
		children: Snippet;
	}

	let { data, children }: Props = $props();

	const shell = $derived({
		storeName: data.settings.store_name,
		storeUrl: data.storeUrl,
		role: data.role,
		email: data.adminEmail,
		otherStores: data.otherStores,
		isPlatformAdmin: data.isPlatformAdmin,
		counters: { pendingOrders: data.pendingOrders, supportUnread: data.supportUnread }
	});
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<AdminTemplate {shell} notice={data.notice}>
	{@render children()}
</AdminTemplate>
