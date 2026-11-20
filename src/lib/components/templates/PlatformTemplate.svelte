<!--
@component
La consola de la plataforma: `StackedLayout` con la barra (marca, secciones y
sesión) fija arriba. Cada página pone su contenido con `PageTemplate`.
-->
<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';
	import type { NotificationInbox } from '$lib/domain/notifications';

	// Iconos
	import LogOut from '@lucide/svelte/icons/log-out';
	import Shield from '@lucide/svelte/icons/shield';

	// App
	import { page } from '$app/state';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import StackedLayout from '$lib/components/layouts/StackedLayout.svelte';
	import ActionToasts from '$lib/components/molecules/ActionToasts.svelte';
	import NotificationBell from '$lib/components/organisms/NotificationBell.svelte';

	// Estado
	import { liveNotifications } from '$lib/stores/live-notifications.svelte';

	// Dominio
	import { isActiveLink } from '$lib/config/admin-nav';

	// Utilidades
	import { cn } from '$lib/utils';

	interface Props {
		email: string;
		/** Si la cuenta también administra tiendas: lleva a su panel. */
		hasStores: boolean;
		/** Los últimos avisos de la plataforma y el total sin leer. */
		notifications: NotificationInbox;
		children: Snippet;
	}

	let { email, hasStores, notifications, children }: Props = $props();

	const BASE_PATH = '/platform/notifications';

	const center = liveNotifications({ inbox: () => notifications, basePath: BASE_PATH });

	const LINKS = [
		{ href: '/platform', label: 'Resumen' },
		{ href: '/platform/stores', label: 'Tiendas' },
		{ href: '/platform/users', label: 'Cuentas' },
		{ href: '/platform/payments', label: 'Pagos' },
		{ href: '/platform/support', label: 'Soporte' }
	];
</script>

<StackedLayout class="admin-shell">
	{#snippet header()}
		<div class="bg-background border-border border-b">
			<div class="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
				<a href="/platform" class="flex items-center gap-2 font-semibold tracking-tight">
					<Shield class="size-4" />
					Globerce · Plataforma
				</a>

				<nav class="flex items-center gap-1" aria-label="Plataforma">
					{#each LINKS as link (link.href)}
						{@const active = isActiveLink(page.url.pathname, link.href, '/platform')}
						<a
							href={link.href}
							aria-current={active ? 'page' : undefined}
							class={cn(
								'px-3 py-1.5 text-sm transition-colors',
								active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
							)}
						>
							{link.label}
						</a>
					{/each}
				</nav>

				<div class="ml-auto flex items-center gap-3">
					<NotificationBell {center} basePath={BASE_PATH} />
					{#if hasStores}
						<a href="/admin" class="text-muted-foreground hover:text-foreground text-sm">Mi panel</a
						>
					{/if}
					<span class="text-muted-foreground hidden text-xs sm:inline">{email}</span>
					<form method="POST" action="/admin/logout">
						<Button type="submit" variant="outline" size="sm">
							<LogOut class="mr-2 size-4" />
							Salir
						</Button>
					</form>
				</div>
			</div>
		</div>
	{/snippet}

	{@render children()}
</StackedLayout>

<ActionToasts />
