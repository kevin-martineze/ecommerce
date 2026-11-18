<script lang="ts">
	// Tipos
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { PageData } from './$types';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { Badge } from '$lib/components/atoms/badge';
	import { Button } from '$lib/components/atoms/button';
	import { Label } from '$lib/components/atoms/label';
	import { Textarea } from '$lib/components/atoms/textarea';
	import PageTemplate from '$lib/components/templates/PageTemplate.svelte';

	// Dominio
	import {
		SUPPORT_CATEGORY_LABEL,
		SUPPORT_STATUS_LABEL,
		SUPPORT_STATUSES,
		type SupportAuthor,
		type SupportStatus
	} from '$lib/domain/support';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let submitting = $state(false);

	const AUTHOR_LABEL: Record<SupportAuthor, string> = {
		OWNER: 'La tienda',
		TEAM: 'Equipo Globerce'
	};

	const CHANGE_LABEL: Record<SupportStatus, string> = {
		OPEN: 'Volver a abrir',
		ANSWERED: 'Marcar como respondido',
		CLOSED: 'Cerrar caso'
	};

	const dateFormatter = new Intl.DateTimeFormat('es-CO', {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	const otherStatuses = $derived(
		SUPPORT_STATUSES.filter((status) => status !== data.thread.ticket.status)
	);

	const submit: SubmitFunction = () => {
		submitting = true;

		return async ({ update }) => {
			await update();
			submitting = false;
		};
	};
</script>

<svelte:head>
	<title>{data.thread.ticket.subject} — Soporte · Plataforma</title>
</svelte:head>

<PageTemplate
	title={data.thread.ticket.subject}
	back={{ href: '/platform/support', label: 'Bandeja de soporte' }}
>
	{#snippet intro()}
		<p>
			{data.thread.ticket.store_name} · {data.thread.ticket.opened_by_email ?? 'cuenta eliminada'}
		</p>
		<div class="flex flex-wrap items-center gap-2">
			<span>{SUPPORT_CATEGORY_LABEL[data.thread.ticket.category]}</span>
			<Badge variant="outline">{SUPPORT_STATUS_LABEL[data.thread.ticket.status]}</Badge>
		</div>
	{/snippet}

	<section class="mb-6 flex flex-wrap gap-2">
		{#each otherStatuses as status (status)}
			<form method="POST" action="?/status" use:enhance={submit}>
				<input type="hidden" name="status" value={status} />
				<Button type="submit" variant="outline" size="sm" disabled={submitting}>
					{CHANGE_LABEL[status]}
				</Button>
			</form>
		{/each}
	</section>

	<section class="mb-8 space-y-3">
		{#each data.thread.messages as message (message.id)}
			<article
				class={message.author === 'TEAM'
					? 'border-border bg-muted ml-auto max-w-xs rounded-lg border p-4 sm:max-w-lg'
					: 'border-border bg-card mr-auto max-w-xs rounded-lg border p-4 sm:max-w-lg'}
			>
				<p class="mb-2 flex items-center justify-between gap-4 text-xs">
					<span class="font-medium">{AUTHOR_LABEL[message.author]}</span>
					<time class="text-muted-foreground" datetime={message.created_at}>
						{dateFormatter.format(new Date(message.created_at))}
					</time>
				</p>
				<p class="text-sm whitespace-pre-line">{message.body}</p>
			</article>
		{/each}
	</section>

	<section class="border-border bg-card rounded-lg border p-6">
		<h2 class="mb-4 text-lg">Responder a la tienda</h2>

		<form method="POST" action="?/reply" class="space-y-4" use:enhance={submit}>
			<div class="space-y-2">
				<Label for="body">Tu respuesta</Label>
				<Textarea id="body" name="body" required rows={4} maxlength={5000} />
			</div>

			<Button type="submit" disabled={submitting}>
				{submitting ? 'Enviando…' : 'Enviar respuesta'}
			</Button>
		</form>
	</section>
</PageTemplate>
