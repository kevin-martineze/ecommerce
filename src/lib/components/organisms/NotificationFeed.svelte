<!--
@component
La bandeja completa de avisos, de a una página: cada aviso se abre con un
form action que lo marca leído y lleva a su detalle. La paginación va en la
URL (`?before=`).
-->
<script lang="ts">
	// Tipos
	import type { NotificationInbox } from '$lib/domain/notifications';

	// Iconos
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { Button } from '$lib/components/atoms/button';

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
		inbox: NotificationInbox;
		/** Donde vive la bandeja y sus actions: `/admin/notifications`. */
		basePath: string;
		/** Si esta no es la primera página. */
		paged: boolean;
	}

	let { inbox, basePath, paged }: Props = $props();

	let opening = $state<string | null>(null);
	// La hora de referencia de «hace 5 min»: la de la carga, no un reloj.
	const now = $derived.by(() => {
		void inbox;

		return new Date();
	});

	const olderHref = $derived(
		inbox.next_before ? `${basePath}?before=${encodeURIComponent(inbox.next_before)}` : null
	);
</script>

{#if inbox.items.length === 0}
	<p class="text-muted-foreground py-12 text-center text-sm">
		{paged ? 'No hay notificaciones más antiguas.' : 'Todavía no tienes notificaciones.'}
	</p>
{:else}
	<ul class="border-border divide-border divide-y rounded-md border">
		{#each inbox.items as notification (notification.id)}
			{@const text = notificationText(notification)}
			{@const unread = notification.read_at === null}
			{@const warning = isWarning(notification)}
			<li>
				<form
					method="POST"
					action="?/read"
					use:enhance={() => {
						opening = notification.id;

						return async ({ update }) => {
							await update();
							opening = null;
						};
					}}
				>
					<input type="hidden" name="id" value={notification.id} />
					<input type="hidden" name="href" value={notificationHref(notification)} />
					<button
						type="submit"
						disabled={opening !== null}
						class={cn(
							'hover:bg-muted flex w-full items-center gap-3 px-4 py-3 text-left transition-colors disabled:opacity-50',
							unread && 'bg-muted/50'
						)}
					>
						<span
							class={cn(
								'size-2 flex-none rounded-full',
								unread ? (warning ? 'bg-sale' : 'bg-primary') : 'bg-transparent'
							)}
							aria-hidden="true"
						></span>
						<span class="min-w-0 flex-1">
							<span class={cn('block text-sm', unread && 'font-medium', warning && 'text-sale')}>
								{text.title}
								{#if unread}<span class="sr-only">(sin leer)</span>{/if}
							</span>
							<span class="text-muted-foreground block text-sm">{text.body}</span>
						</span>
						<span class="text-muted-foreground flex-none text-xs">
							{relativeTime(notification.created_at, now)}
						</span>
						<ChevronRight class="text-muted-foreground size-4 flex-none" />
					</button>
				</form>
			</li>
		{/each}
	</ul>
{/if}

{#if paged || olderHref}
	<nav class="mt-4 flex items-center justify-between gap-2" aria-label="Páginas de notificaciones">
		{#if paged}
			<Button href={basePath} variant="outline" size="sm">Más recientes</Button>
		{:else}
			<span></span>
		{/if}
		{#if olderHref}
			<Button href={olderHref} variant="outline" size="sm">Más antiguos</Button>
		{/if}
	</nav>
{/if}
