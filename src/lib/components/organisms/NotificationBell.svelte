<!--
@component
La campana de avisos del panel y de la consola: el contador de sin leer y,
al abrirla, los últimos avisos. Tocar uno lo marca leído y lleva a su
detalle. No conecta nada: el `NotificationCenter` lo crea el template, que
puede pintar la campana en dos lugares (barra lateral y celular) con una
sola conexión.
-->
<script lang="ts">
	// Tipos
	import type { NotificationCenter } from '$lib/stores/notification-center.svelte';

	// Iconos
	import Bell from '@lucide/svelte/icons/bell';
	import CheckCheck from '@lucide/svelte/icons/check-check';
	import WifiOff from '@lucide/svelte/icons/wifi-off';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { buttonVariants } from '$lib/components/atoms/button';
	import * as Popover from '$lib/components/atoms/popover';

	// Dominio
	import {
		isWarning,
		notificationHref,
		notificationText,
		relativeTime
	} from '$lib/domain/notifications';

	// Utilidades
	import { cn } from '$lib/utils';

	interface Props {
		center: NotificationCenter;
		/** La bandeja completa y sus acciones (`/admin/notifications`). */
		basePath: string;
		align?: 'start' | 'end';
		class?: string;
	}

	let { center, basePath, align = 'end', class: className }: Props = $props();

	let open = $state(false);
	let sending = $state(false);
	/** La hora con la que se calcula «hace 5 min»: se toma al abrir. */
	let now = $state(new Date());

	const badge = $derived(center.unread > 99 ? '99+' : String(center.unread));
	const label = $derived(
		center.unread === 0 ? 'Notificaciones' : `Notificaciones, ${center.unread} sin leer`
	);

	function onOpenChange(next: boolean) {
		if (next) now = new Date();
	}

	const submit = () => {
		sending = true;

		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			sending = false;
			open = false;
		};
	};
</script>

<Popover.Root bind:open {onOpenChange}>
	<Popover.Trigger
		class={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'relative flex-none', className)}
		aria-label={label}
	>
		<Bell class="size-4" />
		{#if center.unread > 0}
			<span
				class="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-xs leading-none font-medium tabular-nums"
				aria-hidden="true"
			>
				{badge}
			</span>
		{/if}
	</Popover.Trigger>

	<Popover.Content {align} class="w-80 p-0">
		<div class="border-border flex items-center gap-2 border-b px-3 py-2">
			<p class="text-sm font-semibold">Notificaciones</p>
			{#if center.status === 'offline'}
				<span class="text-muted-foreground flex items-center gap-1 text-xs">
					<WifiOff class="size-3" />
					Sin conexión en vivo
				</span>
			{/if}
			{#if center.unread > 0}
				<form method="POST" action="{basePath}?/readAll" class="ml-auto" use:enhance={submit}>
					<button
						type="submit"
						disabled={sending}
						class="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs disabled:opacity-50"
					>
						<CheckCheck class="size-3.5" />
						Marcar todo como leído
					</button>
				</form>
			{/if}
		</div>

		{#if center.items.length === 0}
			<p class="text-muted-foreground px-3 py-8 text-center text-sm">
				Todavía no tienes notificaciones.
			</p>
		{:else}
			<ul class="max-h-96 overflow-y-auto">
				{#each center.items as notification (notification.id)}
					{@const text = notificationText(notification)}
					{@const unread = notification.read_at === null}
					<li class="border-border border-b last:border-b-0">
						<form method="POST" action="{basePath}?/read" use:enhance={submit}>
							<input type="hidden" name="id" value={notification.id} />
							<input type="hidden" name="href" value={notificationHref(notification)} />
							<button
								type="submit"
								disabled={sending}
								class={cn(
									'hover:bg-muted flex w-full gap-2 px-3 py-2.5 text-left transition-colors disabled:opacity-50',
									unread && 'bg-muted/50'
								)}
							>
								<span
									class={cn(
										'mt-1.5 size-2 flex-none rounded-full',
										unread ? (isWarning(notification) ? 'bg-sale' : 'bg-primary') : 'bg-transparent'
									)}
									aria-hidden="true"
								></span>
								<span class="min-w-0 flex-1">
									<span
										class={cn(
											'block truncate text-sm',
											unread && 'font-medium',
											isWarning(notification) && 'text-sale'
										)}
									>
										{text.title}
									</span>
									<span class="text-muted-foreground block truncate text-xs">{text.body}</span>
								</span>
								<span class="text-muted-foreground flex-none text-xs">
									{relativeTime(notification.created_at, now)}
								</span>
							</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}

		<a
			href={basePath}
			onclick={() => (open = false)}
			class="border-border text-muted-foreground hover:text-foreground block border-t px-3 py-2 text-center text-xs"
		>
			Ver todos
		</a>
	</Popover.Content>
</Popover.Root>
