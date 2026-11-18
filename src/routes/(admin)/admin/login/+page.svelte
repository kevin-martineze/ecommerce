<script lang="ts">
	// Tipos
	import type { ActionData, PageData } from './$types';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import { Input } from '$lib/components/atoms/input';
	import { Label } from '$lib/components/atoms/label';
	import PasswordField from '$lib/components/molecules/PasswordField.svelte';
	import AuthTemplate from '$lib/components/templates/AuthTemplate.svelte';

	// Estado
	import { FormState } from '$lib/utils/form-state.svelte';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	const submission = new FormState();
</script>

<svelte:head>
	<title>Iniciar sesión — Globerce</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AuthTemplate title="Iniciar sesión">
	<form method="POST" class="space-y-4" use:enhance={submission.submit()}>
		<div class="space-y-2">
			<Label for="email">Correo</Label>
			<Input id="email" name="email" type="email" required autocomplete="username" />
		</div>

		<PasswordField name="password" label="Contraseña" required autocomplete="current-password">
			{#snippet labelAction()}
				<a
					href="/admin/forgot-password"
					class="text-muted-foreground hover:text-foreground text-xs underline"
				>
					¿La olvidaste?
				</a>
			{/snippet}
		</PasswordField>

		{#if form?.error}
			<p class="text-destructive text-sm">{form.error}</p>
		{:else if data.notice === 'no-access'}
			<p class="text-destructive text-sm">Esa cuenta no tiene acceso al panel.</p>
		{:else if data.notice === 'password-reset'}
			<p class="text-success text-sm">Listo, tu contraseña cambió. Entra con la nueva.</p>
		{/if}

		<Button type="submit" class="w-full" disabled={submission.pending}>
			{submission.pending ? 'Entrando…' : 'Entrar'}
		</Button>
	</form>

	{#snippet footer()}
		<span class="space-x-3">
			<a href="/" class="hover:text-foreground underline">Volver a la tienda</a>
			<a href="/signup" class="hover:text-foreground underline">Crear una tienda</a>
		</span>
	{/snippet}
</AuthTemplate>
