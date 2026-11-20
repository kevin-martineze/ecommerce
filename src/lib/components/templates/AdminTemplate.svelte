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
	import type { NotificationInbox } from '$lib/domain/notifications';

	// Componentes
	import AppShellLayout from '$lib/components/layouts/AppShellLayout.svelte';
	import ActionToasts from '$lib/components/molecules/ActionToasts.svelte';
	import SubscriptionBanner from '$lib/components/molecules/SubscriptionBanner.svelte';
	import TabNav from '$lib/components/molecules/TabNav.svelte';
	import AdminSidebar from '$lib/components/organisms/AdminSidebar.svelte';
	import NotificationBell from '$lib/components/organisms/NotificationBell.svelte';

	// Estado
	import { liveNotifications } from '$lib/stores/live-notifications.svelte';

	// Dominio
	import { ADMIN_NAV, navFor } from '$lib/config/admin-nav';

	interface Props {
		shell: AdminShell;
		/** El aviso del plan (vencido, por vencer), o null. */
		notice: SubscriptionNotice | null;
		/** Los últimos avisos y el total sin leer, de la carga del layout. */
		notifications: NotificationInbox;
		children: Snippet;
	}

	let { shell, notice, notifications, children }: Props = $props();

	const BASE_PATH = '/admin/notifications';

	// Una sola conexión aunque la campana se pinte en la barra y en el celular.
	const center = liveNotifications({ inbox: () => notifications, basePath: BASE_PATH });

	const groups = $derived(navFor(ADMIN_NAV, shell.role));
	const links = $derived(groups.flatMap((group) => group.links));
</script>

<AppShellLayout variant="inset" class="admin-shell">
	{#snippet sidebar()}
		<AdminSidebar {shell} {groups}>
			{#snippet actions()}
				<NotificationBell {center} basePath={BASE_PATH} align="start" />
			{/snippet}
		</AdminSidebar>
	{/snippet}

	{#snippet header()}
		<div class="flex items-center gap-1 pr-2">
			<div class="min-w-0 flex-1">
				<TabNav {links} root="/admin" label="Panel" />
			</div>
			<NotificationBell {center} basePath={BASE_PATH} />
		</div>
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
