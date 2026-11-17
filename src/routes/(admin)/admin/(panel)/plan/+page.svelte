<script lang="ts">
	// Tipos
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { PageData } from './$types';

	// Iconos
	import Check from '@lucide/svelte/icons/check';
	import Sparkles from '@lucide/svelte/icons/sparkles';

	// App
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	// Componentes
	import { Badge } from '$lib/components/atoms/badge';
	import { Button } from '$lib/components/atoms/button';
	import * as Table from '$lib/components/atoms/table';
	import UsageMeter from '$lib/components/molecules/UsageMeter.svelte';
	import WompiChargeStatus from '$lib/components/molecules/WompiChargeStatus.svelte';
	import PaymentCard from '$lib/components/organisms/PaymentCard.svelte';

	// Estado
	import { wompiCharge } from '$lib/utils/wompi-checkout.svelte';

	// Dominio
	import { planFeatures, STORE_STATUS_LABEL } from '$lib/domain/account';

	// Utilidades
	import { cn } from '$lib/utils';
	import { formatMoney } from '$lib/utils/money';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const subscription = $derived(data.subscription);
	const plan = $derived(subscription.plan);

	/**
	 * El período que había antes de cobrar. Cuando la pasarela confirma el pago,
	 * el mes nuevo corre desde el fin del actual: si el fin cambia, ya está pago.
	 */
	let periodBeforeCharge = $state('');

	const charge = wompiCharge({
		paid: () => subscription.current_period_end !== periodBeforeCharge,
		reload: () => invalidateAll()
	});

	/** Cobrarse sola es de la dueña, y solo mientras la tienda no esté suspendida. */
	const canPayNow = $derived(
		data.canPay && subscription.self_service_billing && subscription.store_status !== 'suspended'
	);

	/** Los demás planes: cambiar de plan es pagar el nuevo. */
	const others = $derived(data.plans.filter((other) => other.code !== plan.code));

	/** Mientras se confirma o expira el cobro, no se ofrece otro: evita cobrar dos veces. */
	const showCharge = $derived(!charge.confirming && !charge.isExpired);

	/** El plan que se está cobrando: solo su botón dice «Abriendo el pago…». */
	let chargingPlan = $state('');

	const pay: SubmitFunction = ({ formData }) => {
		const selectedCode = formData.get('planCode');

		chargingPlan = typeof selectedCode === 'string' ? selectedCode : '';
		periodBeforeCharge = subscription.current_period_end;
		charge.start();

		return ({ result, update }) => charge.process(result, () => update());
	};

	const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'UTC' });
	const shortDate = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' });

	function date(day: string): string {
		return dateFormatter.format(new Date(`${day}T00:00:00Z`));
	}

	const periodEnd = $derived(date(subscription.current_period_end));
</script>

<svelte:head>
	<title>Plan — Globerce</title>
</svelte:head>

<header class="mb-6">
	<h1 class="text-3xl">Tu plan</h1>
	<p class="text-muted-foreground text-sm">
		Qué incluye, cuánto llevas usado y hasta cuándo está pago.
	</p>
</header>

<!-- El error de cualquier acción, y el mensaje de la tarjeta. Del cobro a mano
     no hay mensaje que dar: cuando sale bien esta página ya no está —se fue a
     la pasarela— y quien confirma es su evento. -->
<div class="mb-6">
	<PaymentCard
		method={subscription.payment_method}
		billing={data.billing}
		canPay={data.canPay}
		{periodEnd}
		inTrial={subscription.store_status === 'trial'}
	/>
</div>

<div class="grid gap-6 lg:grid-cols-3">
	<section
		class={cn(
			'border-border bg-card space-y-4 rounded-lg border p-6 lg:col-span-1',
			plan.ai_replies_per_month > 0 && 'ai-aurora border-transparent'
		)}
	>
		<div class="flex items-center justify-between gap-2">
			<h2 class="text-2xl">{plan.name}</h2>
			<Badge variant={subscription.store_status === 'active' ? 'default' : 'secondary'}>
				{STORE_STATUS_LABEL[subscription.store_status]}
			</Badge>
		</div>

		<p class="text-3xl font-semibold">
			{formatMoney(plan.price_cop)}<span class="text-muted-foreground text-sm font-normal">
				/ mes</span
			>
		</p>

		<dl class="space-y-2 text-sm">
			<div class="flex justify-between gap-4">
				<dt class="text-muted-foreground">
					{subscription.store_status === 'trial' ? 'La prueba termina' : 'Pago hasta'}
				</dt>
				<dd>{periodEnd}</dd>
			</div>
			<div class="flex justify-between gap-4">
				<dt class="text-muted-foreground">Días restantes</dt>
				<dd>{Math.max(0, subscription.days_left)}</dd>
			</div>
			<div class="flex justify-between gap-4">
				<dt class="text-muted-foreground">Dominio propio</dt>
				<dd>{plan.custom_domain ? 'Incluido' : 'No incluido'}</dd>
			</div>
			<div class="flex justify-between gap-4">
				<dt class="text-muted-foreground">Asistente</dt>
				<dd class="flex items-center gap-1.5">
					{#if plan.ai_replies_per_month > 0}
						<Sparkles class="size-3.5" />
						{plan.ai_replies_per_month.toLocaleString('es-CO')} respuestas/mes
					{:else}
						No incluido
					{/if}
				</dd>
			</div>
		</dl>

		{#if canPayNow}
			{#if showCharge}
				<form
					method="POST"
					action="?/pay"
					class="border-border space-y-2 border-t pt-4"
					use:enhance={pay}
				>
					<input type="hidden" name="planCode" value={plan.code} />
					<Button type="submit" class="w-full" disabled={charge.opening}>
						{charge.opening && chargingPlan === plan.code
							? 'Abriendo el pago…'
							: `Pagar un mes de ${plan.name}`}
					</Button>
					<p class="text-muted-foreground text-xs">
						El mes nuevo suma desde que termina el período actual, y el plan queda al día cuando el
						pago se confirma.
					</p>
				</form>
			{/if}

			<WompiChargeStatus {charge} />
		{:else}
			<p class="text-muted-foreground border-border border-t pt-4 text-xs">
				{#if !data.canPay}
					Solo el creador de la tienda puede cambiar o pagar el plan.
				{:else if subscription.store_status === 'suspended'}
					Tu tienda está suspendida: escríbenos por WhatsApp para reactivarla.
				{:else}
					Los pagos se registran a mano por ahora. Para pagar o cambiar de plan, escríbenos por
					WhatsApp con el nombre de tu tienda.
				{/if}
			</p>
		{/if}
	</section>

	<section class="border-border bg-card rounded-lg space-y-6 border p-6 lg:col-span-2">
		<h2 class="text-lg">Uso</h2>

		<UsageMeter
			label="Productos"
			used={subscription.usage.products}
			limit={plan.max_products}
			hint="Las archivadas también cuentan."
		/>

		<UsageMeter
			label="Pedidos de este mes"
			used={subscription.usage.orders_this_month}
			limit={plan.max_orders_per_month}
			hint="Se reinicia el día 1, hora de Colombia."
		/>

		<div class="text-sm">
			<p>Fotos por producto</p>
			<p class="text-muted-foreground">
				{plan.max_images_per_product === null
					? 'Sin límite'
					: `Hasta ${plan.max_images_per_product} por producto`}
			</p>
		</div>

		<p class="text-muted-foreground text-xs">
			Al llegar a un límite no se borra nada: solo no puedes crear más hasta cambiar de plan.
		</p>
	</section>
</div>

{#if canPayNow && others.length > 0}
	<section class="mt-8">
		<h2 class="mb-1 text-lg">Cambiar de plan</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			El plan nuevo empieza al pagarlo y el mes corre desde que termina el que tienes.
		</p>

		<div class="grid gap-4 md:grid-cols-2">
			{#each others as other (other.code)}
				<div
					class={cn(
						'border-border bg-card flex flex-col rounded-lg border p-6',
						other.ai_replies_per_month > 0 && 'ai-aurora border-transparent'
					)}
				>
					<div class="flex items-baseline justify-between gap-3">
						<h3 class="flex items-center gap-2 text-xl">
							{other.name}
							{#if other.ai_replies_per_month > 0}
								<Sparkles class="size-4" />
							{/if}
						</h3>
						<p class="font-semibold">
							{formatMoney(other.price_cop)}<span class="text-muted-foreground text-xs font-normal">
								/ mes</span
							>
						</p>
					</div>

					<ul class="mt-4 space-y-2 text-sm">
						{#each planFeatures(other) as feature (feature)}
							<li class="flex items-start gap-2">
								<Check class="text-muted-foreground mt-0.5 size-4 flex-none" />
								<span>{feature}</span>
							</li>
						{/each}
					</ul>

					{#if showCharge}
						<form method="POST" action="?/pay" class="mt-6" use:enhance={pay}>
							<input type="hidden" name="planCode" value={other.code} />
							<Button
								type="submit"
								variant={other.price_cop > plan.price_cop ? 'default' : 'outline'}
								class="w-full"
								disabled={charge.opening}
							>
								{charge.opening && chargingPlan === other.code
									? 'Abriendo el pago…'
									: `Pasarme a ${other.name}`}
							</Button>
						</form>
					{/if}
				</div>
			{/each}
		</div>

		<div class="mt-4">
			<WompiChargeStatus {charge} />
		</div>
	</section>
{/if}

{#if subscription.payments.length > 0}
	<section class="border-border bg-card rounded-lg mt-8 border p-6">
		<h2 class="mb-4 text-lg">Tus pagos</h2>

		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Fecha</Table.Head>
					<Table.Head>Período</Table.Head>
					<Table.Head>Medio</Table.Head>
					<Table.Head class="text-right">Valor</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each subscription.payments as payment (payment.id)}
					<Table.Row>
						<Table.Cell>{shortDate.format(new Date(payment.created_at))}</Table.Cell>
						<Table.Cell class="text-muted-foreground">
							{shortDate.format(new Date(`${payment.period_start}T00:00:00Z`))} —
							{shortDate.format(new Date(`${payment.period_end}T00:00:00Z`))}
						</Table.Cell>
						<Table.Cell class={cn(payment.method === 'simulado' && 'text-muted-foreground')}>
							{payment.method === 'simulado' ? 'Pago de prueba' : payment.method}
						</Table.Cell>
						<Table.Cell class="text-right tabular-nums"
							>{formatMoney(payment.amount_cop)}</Table.Cell
						>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</section>
{/if}
