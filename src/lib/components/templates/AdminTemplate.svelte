<!--
@component
El panel de una tienda: `AppShellLayout` con la barra lateral, la navegación
del celular y el aviso de la suscripción fijos. Lo usa el layout de
`(panel)`; cada página pone su contenido con `PageTemplate`.
-->
<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';
	import type { AdminShell } from '$lib/config/admin-nav';
	import type { SubscriptionNotice } from '$lib/domain/account';

	// Componentes
	import AppShellLayout from '$lib/components/layouts/AppShellLayout.svelte';
	import ActionToasts from '$lib/components/molecules/ActionToasts.svelte';
	import SubscriptionBanner from '$lib/components/molecules/SubscriptionBanner.svelte';
	import TabNav from '$lib/components/molecules/TabNav.svelte';
	import AdminSidebar from '$lib/components/organisms/AdminSidebar.svelte';

	// Dominio
	import { ADMIN_NAV, navFor } from '$lib/config/admin-nav';

	interface Props {
		shell: AdminShell;
		/** El aviso del plan (vencido, por vencer), o null. */
		notice: SubscriptionNotice | null;
		children: Snippet;
	}

	let { shell, notice, children }: Props = $props();

	const groups = $derived(navFor(ADMIN_NAV, shell.role));
	const links = $derived(groups.flatMap((group) => group.links));
</script>

<AppShellLayout variant="inset" class="admin-shell">
	{#snippet sidebar()}
		<AdminSidebar {shell} {groups} />
	{/snippet}

	{#snippet header()}
		<TabNav {links} root="/admin" label="Panel" />
	{/snippet}

	{#snippet banner()}
		{#if notice}
			<div class="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
				<SubscriptionBanner {notice} />
			</div>
		{/if}
	{/snippet}

	{@render children()}
</AppShellLayout>

<ActionToasts />
