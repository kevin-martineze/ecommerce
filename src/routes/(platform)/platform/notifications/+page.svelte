<script lang="ts">
	// Tipos
	import type { PageData } from './$types';

	// Iconos
	import CheckCheck from '@lucide/svelte/icons/check-check';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import NotificationFeed from '$lib/components/organisms/NotificationFeed.svelte';
	import PushToggle from '$lib/components/organisms/PushToggle.svelte';
	import PageTemplate from '$lib/components/templates/PageTemplate.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let sending = $state(false);
</script>

<svelte:head>
	<title>Notificaciones — Globerce</title>
</svelte:head>

<PageTemplate
	title="Notificaciones"
	description="Tiendas y cuentas nuevas, pagos de planes y soporte. Te llegan en vivo mientras tengas la consola abierta."
	width="narrow"
>
	{#snippet actions()}
		{#if data.inbox.unread > 0}
			<form
				method="POST"
				action="?/readAll"
				use:enhance={() => {
					sending = true;

					return async ({ update }) => {
						await update();
						sending = false;
					};
				}}
			>
				<Button type="submit" variant="outline" size="sm" disabled={sending}>
					<CheckCheck class="size-4" />
					Marcar todo como leído
				</Button>
			</form>
		{/if}
	{/snippet}

	<PushToggle publicKey={data.pushKey} scope={data.pushScope} />

	<NotificationFeed
		inbox={data.inbox}
		basePath="/platform/notifications"
		paged={data.before !== null}
	/>
</PageTemplate>
