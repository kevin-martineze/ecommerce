<script lang="ts">
	// Tipos
	import type { PageData } from './$types';

	// Iconos
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import AuthCard from '$lib/components/molecules/AuthCard.svelte';

	// Estado
	import { FormState } from '$lib/utils/form-state.svelte';

	// Utilidades
	import { formatMoney } from '$lib/utils/money';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const submission = new FormState();
</script>

<svelte:head>
	<title>Pago de prueba — Globerce</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AuthCard eyebrow="Pago de prueba" title="Aquí iría la pasarela">
	<div class="border-sale text-sale mb-6 flex items-start gap-2 border p-3 text-sm">
		<TriangleAlert class="mt-0.5 size-4 flex-none" />
		<p>
			Esto no cobra nada. Es la pasarela de mentira que se usa mientras no hay una de verdad
			conectada.
		</p>
	</div>

	<dl class="border-border space-y-2 border p-4 text-sm">
		<div class="flex justify-between gap-4">
			<dt class="text-muted-foreground">Concepto</dt>
			<dd class="text-right">{data.concept}</dd>
		</div>
		<div class="flex justify-between gap-4">
			<dt class="text-muted-foreground">Total</dt>
			<dd class="text-lg font-semibold tabular-nums">{formatMoney(data.amount)}</dd>
		</div>
		<div class="flex justify-between gap-4">
			<dt class="text-muted-foreground">Referencia</dt>
			<dd class="text-muted-foreground truncate text-right text-xs">{data.reference}</dd>
		</div>
	</dl>

	<form method="POST" action="?/approve" class="mt-6 space-y-3" use:enhance={submission.submit()}>
		<input type="hidden" name="reference" value={data.reference} />
		<input type="hidden" name="amount" value={data.amount} />
		<input type="hidden" name="returnTo" value={data.returnTo} />

		<Button type="submit" class="w-full" disabled={submission.pending}>
			<CreditCard class="mr-2 size-4" />
			{submission.pending ? 'Confirmando…' : 'Aprobar el pago'}
		</Button>

		<Button href={data.returnTo} variant="outline" class="w-full">Cancelar</Button>
	</form>
</AuthCard>
