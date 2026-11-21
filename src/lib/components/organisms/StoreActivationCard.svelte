<script lang="ts">
	// Tipos
	import type { ActivationStage, StoreActivation } from '$lib/domain/activation';

	// Iconos
	import Circle from '@lucide/svelte/icons/circle';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import MessageCircle from '@lucide/svelte/icons/message-circle';

	// Componentes
	import { Button } from '$lib/components/atoms/button';

	// Dominio
	import { ACTIVATION_STAGE_LABEL, ACTIVATION_STAGES } from '$lib/domain/activation';

	// Utilidades
	import { normalizePhone } from '$lib/utils/whatsapp';

	interface Props {
		activation: StoreActivation;
		/** Cuándo se creó la tienda: es la fecha de su primera etapa. */
		createdAt: string;
	}

	let { activation, createdAt }: Props = $props();

	const dateFormatter = new Intl.DateTimeFormat('es-CO', {
		dateStyle: 'medium',
		timeZone: 'America/Bogota'
	});

	const instantFormatter = new Intl.DateTimeFormat('es-CO', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'America/Bogota'
	});

	/** La fecha que marca cada etapa: el hito correspondiente, o la creación. */
	const milestones: Record<ActivationStage, string | null> = $derived({
		created: createdAt,
		catalog: activation.first_product_at,
		first_order: activation.first_order_at,
		first_sale: activation.first_sale_at,
		paying: activation.first_payment_at
	});

	const currentIndex = $derived(ACTIVATION_STAGES.indexOf(activation.stage));

	const steps = $derived(
		ACTIVATION_STAGES.map((stage, index) => ({
			stage,
			label: ACTIVATION_STAGE_LABEL[stage],
			reached: index <= currentIndex,
			date: milestones[stage]
		}))
	);

	/** Solo dígitos: wa.me no acepta «+», espacios ni guiones. Vacío si no hay número. */
	const phone = $derived(activation.contact_phone ? normalizePhone(activation.contact_phone) : '');

	const lastSeen = $derived(
		activation.last_seen_at ? instantFormatter.format(new Date(activation.last_seen_at)) : 'Nunca'
	);
</script>

<section class="border-border bg-card rounded-lg border p-6 text-sm">
	<h2 class="mb-4 text-lg">Activación</h2>

	<ol class="space-y-3">
		{#each steps as step (step.stage)}
			<li class="flex items-start gap-3">
				{#if step.reached}
					<CircleCheck class="text-primary mt-0.5 size-4 shrink-0" />
				{:else}
					<Circle class="text-muted-foreground mt-0.5 size-4 shrink-0" />
				{/if}

				<div class="min-w-0">
					<p class={step.reached ? 'font-medium' : 'text-muted-foreground'}>{step.label}</p>
					<p class="text-muted-foreground text-xs">
						{#if !step.reached}
							Todavía no
						{:else if step.date}
							{dateFormatter.format(new Date(step.date))}
						{:else}
							Sin fecha registrada
						{/if}
					</p>
				</div>
			</li>
		{/each}
	</ol>

	<h3 class="mt-6 mb-3 font-medium">Lista de control</h3>

	<dl class="space-y-2">
		<div class="flex justify-between gap-4">
			<dt class="text-muted-foreground">Logo</dt>
			<dd>{activation.has_logo ? 'Sí' : 'No'}</dd>
		</div>
		<div class="flex justify-between gap-4">
			<dt class="text-muted-foreground">Wompi</dt>
			<dd>{activation.wompi_connected ? 'Conectado' : 'No conectado'}</dd>
		</div>
		<div class="flex justify-between gap-4">
			<dt class="text-muted-foreground">Prendas activas con foto</dt>
			<dd class="tabular-nums">{activation.active_products_with_photo}</dd>
		</div>
		<div class="flex justify-between gap-4">
			<dt class="text-muted-foreground">Última vez en el panel</dt>
			<dd>{lastSeen}</dd>
		</div>
	</dl>

	{#if phone}
		<Button
			href={`https://wa.me/${phone}`}
			target="_blank"
			rel="noopener"
			class="bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90 mt-6 w-full"
		>
			<MessageCircle class="mr-2 size-4" />
			Escribirle por WhatsApp
		</Button>
	{/if}
</section>
