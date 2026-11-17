<script lang="ts">
	// Tipos
	import type { ActionData, PageData } from './$types';

	// Componentes
	import RegisterForm from '$lib/components/organisms/RegisterForm.svelte';
	import AuthTemplate from '$lib/components/templates/AuthTemplate.svelte';

	// Dominio
	import { TRIAL_DAYS } from '$lib/domain/account';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();
</script>

<svelte:head>
	<title>Crea tu tienda — Globerce</title>
</svelte:head>

<AuthTemplate
	eyebrow={data.signedIn ? 'Otra tienda' : `${TRIAL_DAYS} días gratis`}
	title="Crea tu tienda en Globerce"
	wide
>
	<RegisterForm
		signedIn={data.signedIn}
		addressSuffix={data.addressSuffix}
		plans={data.plans}
		selectedPlan={data.selectedPlan}
		result={form ?? null}
	/>

	{#snippet footer()}
		{#if data.signedIn}
			<a href="/admin" class="hover:text-foreground underline">Volver al panel</a>
		{:else}
			¿Ya tienes tienda?
			<a href="/admin/login" class="hover:text-foreground underline">Inicia sesión</a>
		{/if}
	{/snippet}
</AuthTemplate>
