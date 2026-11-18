<!--
@component
Una fila de enlaces que se desliza de lado: la navegación del celular cuando
no cabe una barra lateral.
-->
<script lang="ts">
	// App
	import { page } from '$app/state';

	// Dominio
	import { isActiveLink } from '$lib/config/admin-nav';

	// Utilidades
	import { cn } from '$lib/utils';

	interface Props {
		links: { href: string; label: string }[];
		/** La raíz de la sección: solo cuenta activa en su dirección exacta. */
		root: string;
		label: string;
	}

	let { links, root, label }: Props = $props();
</script>

<nav class="flex items-center gap-3 overflow-x-auto px-4 py-3" aria-label={label}>
	{#each links as link (link.href)}
		{@const active = isActiveLink(page.url.pathname, link.href, root)}
		<a
			href={link.href}
			aria-current={active ? 'page' : undefined}
			class={cn(
				'text-sm whitespace-nowrap',
				active ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground'
			)}
		>
			{link.label}
		</a>
	{/each}
</nav>
