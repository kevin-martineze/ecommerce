<!--
@component
La barra lateral del panel: la tienda, la acción rápida, el selector de
tienda, la navegación y la sesión.
-->
<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';
	import type { AdminShell, NavGroup } from '$lib/config/admin-nav';

	// Svelte
	import { tick } from 'svelte';

	// Iconos
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Plus from '@lucide/svelte/icons/plus';
	import Shield from '@lucide/svelte/icons/shield';

	// App
	import { page } from '$app/state';

	// Componentes
	import { Badge } from '$lib/components/atoms/badge';
	import { Button } from '$lib/components/atoms/button';
	import SelectField from '$lib/components/molecules/SelectField.svelte';
	import StoreBrand from '$lib/components/molecules/StoreBrand.svelte';

	// Dominio
	import { isActiveLink } from '$lib/config/admin-nav';
	import { MEMBER_ROLE_LABEL } from '$lib/domain/account';

	// Utilidades
	import { cn } from '$lib/utils';

	interface Props {
		shell: AdminShell;
		groups: NavGroup[];
		/** Lo que va junto al nombre de la tienda: la campana de avisos. */
		actions?: Snippet;
	}

	let { shell, groups, actions }: Props = $props();

	// Las otras tiendas de la cuenta. La que se administra no va en la lista:
	// es el texto del selector.
	const switchOptions = $derived(
		shell.otherStores.map((store) => ({ value: store.id, label: store.name }))
	);

	let switchForm = $state<HTMLFormElement | null>(null);

	// Elegir una tienda envía el form. El valor llega al input oculto en el
	// siguiente tick, así que el envío espera a ese tick para llevar la tienda.
	function submitSwitch() {
		void tick().then(() => switchForm?.requestSubmit());
	}
</script>

<div class="flex min-h-full flex-col gap-2 p-3">
	<!-- La marca de la tienda que se administra (su logo o, si no tiene, su
	     nombre), no la de Globerce. Lleva a la vitrina, que es lo que la
	     dueña quiere abrir cada dos por tres. -->
	<div class="flex items-center gap-1">
		<a
			href={shell.storeUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="hover:bg-sidebar-accent flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 transition-colors"
		>
			<span class="flex min-w-0 items-center truncate text-sm font-semibold">
				<StoreBrand name={shell.storeName} logoUrl={shell.storeLogo} class="h-7 max-w-40 md:h-7" />
			</span>
			<ExternalLink class="text-muted-foreground ml-auto size-3.5 flex-none" />
		</a>
		{@render actions?.()}
	</div>

	<!-- La acción rápida: lo que más se crea es un producto. -->
	<Button href="/admin/products/new" size="sm" class="mt-1 h-9 w-full justify-start">
		<Plus class="size-4" />
		Nuevo producto
	</Button>

	{#if shell.otherStores.length > 0}
		<!-- Una cuenta puede administrar varias tiendas. Sin esto, cambiar
		     de una a otra era escribir el subdominio a mano. -->
		<form bind:this={switchForm} method="POST" action="/admin/switch-store" class="px-2 pt-2">
			<label class="text-muted-foreground text-xs" for="switch-store">Cambiar de tienda</label>
			<SelectField
				id="switch-store"
				name="storeId"
				class="mt-1"
				placeholder={shell.storeName}
				options={switchOptions}
				align="start"
				onValueChange={submitSwitch}
			/>
		</form>
	{/if}

	<nav class="flex-1" aria-label="Panel">
		{#each groups as group (group.title ?? 'main')}
			<div class="pt-3">
				{#if group.title}
					<p class="text-muted-foreground px-2 pb-1 text-xs">{group.title}</p>
				{/if}
				{#each group.links as link (link.href)}
					{@const count = link.counter ? shell.counters[link.counter] : 0}
					<a
						href={link.href}
						aria-current={isActiveLink(page.url.pathname, link.href) ? 'page' : undefined}
						class={cn(
							'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
							isActiveLink(page.url.pathname, link.href)
								? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
								: 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'
						)}
					>
						<link.icon class="size-4 flex-none" />
						{link.label}
						{#if count > 0}
							<Badge class="ml-auto">{count}</Badge>
						{/if}
					</a>
				{/each}
			</div>
		{/each}

		{#if shell.isPlatformAdmin}
			<div class="pt-3">
				<a
					href="/platform"
					class="text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
				>
					<Shield class="size-4 flex-none" />
					Plataforma
				</a>
			</div>
		{/if}
	</nav>

	<div class="border-sidebar-border space-y-2 border-t pt-3">
		<p class="text-muted-foreground truncate px-2 text-xs">
			{shell.email} · {MEMBER_ROLE_LABEL[shell.role]}
		</p>
		<form method="POST" action="/admin/logout">
			<Button type="submit" variant="ghost" size="sm" class="w-full justify-start">
				<LogOut class="size-4" />
				Salir
			</Button>
		</form>
	</div>
</div>
