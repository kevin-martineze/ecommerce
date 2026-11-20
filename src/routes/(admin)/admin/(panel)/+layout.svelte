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
		storeLogo: data.settings.logo_url,
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
	<!-- Instalable desde el celular: en iPhone es lo que habilita el push. -->
	<link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>

<AdminTemplate {shell} notice={data.notice} notifications={data.notifications}>
	{@render children()}
</AdminTemplate>
