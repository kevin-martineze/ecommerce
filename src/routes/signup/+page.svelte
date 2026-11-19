<script lang="ts">
	// Tipos
	import type { ActionData, PageData } from './$types';

	// Componentes
	import AuthDivider from '$lib/components/molecules/AuthDivider.svelte';
	import GoogleSignInButton from '$lib/components/molecules/GoogleSignInButton.svelte';
	import RegisterForm from '$lib/components/organisms/RegisterForm.svelte';
	import AuthTemplate from '$lib/components/templates/AuthTemplate.svelte';

	// Dominio
	import { TRIAL_DAYS } from '$lib/domain/account';
	import { googleNotice } from '$lib/domain/google-auth';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	const googleMessage = $derived(googleNotice(data.notice));
</script>

<svelte:head>
	<title>Crea tu tienda — Globerce</title>
</svelte:head>

<AuthTemplate
	eyebrow={data.signedIn ? 'Otra tienda' : `${TRIAL_DAYS} días gratis`}
	title="Crea tu tienda en Globerce"
	wide
>
	{#if googleMessage}
		<p class="text-destructive mb-6 text-sm">{googleMessage}</p>
	{/if}

	{#if data.googleHref}
		<div class="mb-8 space-y-6">
			<GoogleSignInButton href={data.googleHref} label="Registrarte con Google" />
			<AuthDivider />
		</div>
	{/if}

	<RegisterForm
		signedIn={data.signedIn}
		google={data.google}
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
