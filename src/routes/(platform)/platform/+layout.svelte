<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	// Iconos
	import LogOut from '@lucide/svelte/icons/log-out';
	import Shield from '@lucide/svelte/icons/shield';

	// App
	import { page } from '$app/state';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import ActionToasts from '$lib/components/molecules/ActionToasts.svelte';

	// Utilidades
	import { cn } from '$lib/utils';

	interface Props {
		data: LayoutData;
		children: Snippet;
	}

	let { data, children }: Props = $props();

	const links = [
		{ href: '/platform', label: 'Resumen' },
		{ href: '/platform/stores', label: 'Tiendas' },
		{ href: '/platform/payments', label: 'Pagos' },
		{ href: '/platform/support', label: 'Soporte' }
	];

	function isActive(href: string): boolean {
		return href === '/platform'
			? page.url.pathname === '/platform'
			: page.url.pathname.startsWith(href);
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin-shell min-h-screen">
	<header class="bg-background border-border border-b">
		<div class="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
			<a href="/platform" class="flex items-center gap-2 font-semibold tracking-tight">
				<Shield class="size-4" />
				Globerce · Plataforma
			</a>

			<nav class="flex items-center gap-1">
				{#each links as link (link.href)}
					<a
						href={link.href}
						class={cn(
							'px-3 py-1.5 text-sm transition-colors',
							isActive(link.href)
								? 'bg-muted text-foreground'
								: 'text-muted-foreground hover:text-foreground'
						)}
					>
						{link.label}
					</a>
				{/each}
			</nav>

			<div class="ml-auto flex items-center gap-3">
				{#if data.hasStores}
					<a href="/admin" class="text-muted-foreground hover:text-foreground text-sm">Mi panel</a>
				{/if}
				<span class="text-muted-foreground hidden text-xs sm:inline">{data.adminEmail}</span>
				<form method="POST" action="/admin/logout">
					<Button type="submit" variant="outline" size="sm">
						<LogOut class="mr-2 size-4" />
						Salir
					</Button>
				</form>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
		<ActionToasts />
		{@render children()}
	</main>
</div>
