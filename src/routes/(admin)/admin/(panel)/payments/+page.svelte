<script lang="ts">
	// Tipos
	import type { PageData } from './$types';

	// Iconos
	import Check from '@lucide/svelte/icons/check';
	import CreditCard from '@lucide/svelte/icons/credit-card';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import WompiKeysPaste from '$lib/components/molecules/WompiKeysPaste.svelte';
	import PageTemplate from '$lib/components/templates/PageTemplate.svelte';

	// Estado
	import { FormState } from '$lib/utils/form-state.svelte';

	// Utilidades
	import { cn } from '$lib/utils';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const submission = new FormState();
	/** Abierto cuando la dueña quiere reemplazar las llaves de una cuenta ya conectada. */
	let changing = $state(false);
	let copied = $state(false);

	const paymentAccount = $derived(data.account);
	const isConnected = $derived(paymentAccount.connected);
	const conAviso = $derived(isConnected && paymentAccount.last_event_at !== null);
	/** Con la cuenta conectada y avisando, la página es un resumen; si no, los tres pasos. */
	const summary = $derived(conAviso && !changing);

	const dateTime = new Intl.DateTimeFormat('es-CO', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'America/Bogota'
	});

	function formatValue(iso: string | null): string {
		return iso ? dateTime.format(new Date(iso)) : 'Todavía no';
	}

	const modeLabel = $derived(
		paymentAccount.mode === 'test'
			? 'Pruebas'
			: paymentAccount.mode === 'prod'
				? 'Producción'
				: 'Sin reconocer'
	);

	async function copy() {
		if (!paymentAccount.events_url) return;

		await navigator.clipboard.writeText(paymentAccount.events_url);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<svelte:head>
	<title>Pagos — Globerce</title>
</svelte:head>

<PageTemplate
	title="Cobrar en línea"
	description="Conecta tu cuenta de Wompi y tus clientes podrán pagar con tarjeta, transferencia o billetera sin salir de tu tienda. La plata llega a tu cuenta: Globerce no la toca ni cobra comisión por venta."
>
	{#if !data.canManage}
		<p class="text-muted-foreground text-sm">
			Solo la persona dueña de la tienda puede conectar la cuenta de cobro.
		</p>
	{:else}
		<section class="border-border bg-card rounded-lg space-y-8 border p-6">
			{#if summary}
				<div class="space-y-5">
					<div class="flex items-center gap-2">
						<CreditCard class="size-5" />
						<h2 class="text-lg">Estás cobrando en línea</h2>
					</div>

					<dl class="grid gap-4 text-sm sm:grid-cols-2">
						<div>
							<dt class="text-muted-foreground">Comercio en Wompi</dt>
							<dd>{paymentAccount.merchant_name ?? '—'}</dd>
						</div>
						<div>
							<dt class="text-muted-foreground">Modo</dt>
							<dd>{modeLabel}</dd>
						</div>
						<div>
							<dt class="text-muted-foreground">Último pago avisado</dt>
							<dd>{formatValue(paymentAccount.last_event_at)}</dd>
						</div>
						<div>
							<dt class="text-muted-foreground">Llave pública</dt>
							<dd class="font-mono text-xs">
								{paymentAccount.public_key ? `${paymentAccount.public_key.slice(0, 12)}…` : '—'}
							</dd>
						</div>
						<div>
							<dt class="text-muted-foreground">Conectada desde</dt>
							<dd>{formatValue(paymentAccount.updated_at)}</dd>
						</div>
					</dl>

					<div>
						<Button type="button" variant="outline" onclick={() => (changing = true)}>
							Cambiar llaves
						</Button>
					</div>

					<details class="text-sm">
						<summary class="text-muted-foreground cursor-pointer">Ver la URL de eventos</summary>
						<div class="border-border mt-3 flex items-center gap-2 border p-2">
							<code class="text-muted-foreground flex-1 truncate text-xs"
								>{paymentAccount.events_url}</code
							>
							<Button type="button" variant="outline" size="sm" onclick={copy}>
								{copied ? 'Copiado' : 'Copiar'}
							</Button>
						</div>
					</details>
				</div>
			{:else}
				<ol class="space-y-8">
					<!-- Paso 1: tener la cuenta en Wompi. -->
					<li class="flex gap-4">
						<span
							class="border-border grid size-8 flex-none place-items-center rounded-full border text-sm"
						>
							{#if isConnected}<Check class="size-4" />{:else}1{/if}
						</span>
						<div class="min-w-0 flex-1 space-y-2">
							<h2 class="text-lg">Ten tu cuenta en Wompi</h2>
							<p class="text-muted-foreground text-sm">
								Abre tu cuenta de comercio con el NIT o la cédula de tu negocio. Wompi te entrega
								las llaves para cobrar.
							</p>
							<Button
								href="https://comercios.wompi.co"
								target="_blank"
								rel="noopener"
								variant="outline"
								size="sm"
							>
								Abrir Wompi
							</Button>
						</div>
					</li>

					<!-- Paso 2: pegar las llaves. Con la cuenta conectada se muestra como hecho. -->
					<li class="flex gap-4">
						<span
							class="border-border grid size-8 flex-none place-items-center rounded-full border text-sm"
						>
							{#if isConnected}<Check class="size-4" />{:else}2{/if}
						</span>
						<div class="min-w-0 flex-1 space-y-3">
							<h2 class="text-lg">Copia tus llaves y pégalas aquí</h2>

							{#if isConnected && !changing}
								<p class="text-muted-foreground text-sm">Tus llaves ya están conectadas.</p>
								<Button type="button" variant="outline" size="sm" onclick={() => (changing = true)}>
									Cambiar llaves
								</Button>
							{:else}
								<p class="text-muted-foreground text-sm">
									En Wompi, ve a <span class="text-foreground">Desarrollo › Desarrolladores</span> y copia
									las cuatro llaves de tu modo de pruebas o de producción.
								</p>

								<form
									method="POST"
									action="?/connect"
									novalidate
									class="space-y-4"
									use:enhance={submission.submit({ onSuccess: () => (changing = false) })}
								>
									<WompiKeysPaste
										submitting={submission.pending}
										submitLabel={isConnected ? 'Reemplazar llaves' : 'Conectar'}
									/>

									{#if changing}
										<Button type="button" variant="ghost" onclick={() => (changing = false)}>
											Cancelar
										</Button>
									{/if}
								</form>
							{/if}
						</div>
					</li>

					<!-- Paso 3: el aviso de cada pago. Se activa cuando la cuenta está conectada. -->
					<li class={cn('flex gap-4', !isConnected && 'opacity-60')}>
						<span
							class="border-border grid size-8 flex-none place-items-center rounded-full border text-sm"
						>
							3
						</span>
						<div class="min-w-0 flex-1 space-y-3">
							<h2 class="text-lg">Pide a Wompi que te avise de cada pago</h2>

							{#if !isConnected}
								<p class="text-muted-foreground text-sm">Se activa cuando conectes tu cuenta.</p>
							{:else}
								<p class="text-muted-foreground text-sm">
									En Wompi, ve a
									<span class="text-foreground"
										>Desarrollo › Desarrolladores › Pagos a terceros</span
									>
									y pega esta dirección como URL de eventos.
								</p>

								<div class="border-border flex items-center gap-2 border p-2">
									<code class="text-muted-foreground flex-1 truncate text-xs">
										{paymentAccount.events_url}
									</code>
									<Button type="button" variant="outline" size="sm" onclick={copy}>
										{copied ? 'Copiado' : 'Copiar'}
									</Button>
								</div>

								{#if paymentAccount.last_event_at === null}
									<p class="text-caution text-sm">Esperando el primer aviso de Wompi.</p>
								{/if}

								<p class="text-muted-foreground text-xs">
									Sin ese aviso, un pedido pagado te aparecería como sin pagar: es lo que confirma
									el cobro.
								</p>
							{/if}
						</div>
					</li>
				</ol>
			{/if}

			{#if isConnected}
				<form
					method="POST"
					action="?/disconnect"
					class="border-border border-t pt-6"
					use:enhance={submission.submit()}
				>
					<Button type="submit" variant="outline" disabled={submission.pending}>
						Dejar de cobrar en línea
					</Button>
					<p class="text-muted-foreground mt-2 text-xs">
						Tus pedidos seguirán llegando por WhatsApp, como siempre.
					</p>
				</form>
			{/if}
		</section>
	{/if}
</PageTemplate>
