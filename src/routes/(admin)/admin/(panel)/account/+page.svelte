<script lang="ts">
	// Tipos
	import type { PageData } from './$types';

	// Iconos
	import ExternalLink from '@lucide/svelte/icons/external-link';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { Badge } from '$lib/components/atoms/badge';
	import { Button } from '$lib/components/atoms/button';
	import ConfirmDialog from '$lib/components/molecules/ConfirmDialog.svelte';
	import PasswordField from '$lib/components/molecules/PasswordField.svelte';
	import PageTemplate from '$lib/components/templates/PageTemplate.svelte';

	// Estado
	import { FormState } from '$lib/utils/form-state.svelte';

	// Dominio
	import { MEMBER_ROLE_LABEL } from '$lib/domain/account';
	import { PASSWORD_MIN } from '$lib/schemas/account';

	// Recursos
	import googleG from '$lib/assets/google-g.svg';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const submission = new FormState();
	const creation = new FormState();
	const unlinking = new FormState();
	let passwordForm = $state<HTMLFormElement>();
	let creationForm = $state<HTMLFormElement>();
	let unlinkOpen = $state(false);

	const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });
</script>

<svelte:head>
	<title>Mi cuenta — Globerce</title>
</svelte:head>

<PageTemplate
	title="Mi cuenta"
	description="{data.user.full_name ?? data.user.email} · {data.user.email}"
>
	<div class="grid gap-6 lg:grid-cols-2">
		{#if data.signIn}
			<section class="border-border bg-card rounded-lg border p-6">
				<h2 class="mb-4 text-lg">Cómo entras</h2>

				<div class="flex items-start gap-3">
					<img src={googleG} alt="" class="mt-0.5 size-4.5" aria-hidden="true" />

					<div class="min-w-0 space-y-1">
						<p class="text-sm font-medium">Google</p>

						{#if data.signIn.google}
							<p class="text-sm break-all">{data.signIn.google.email}</p>
							<p class="text-muted-foreground text-xs">
								Conectado el {dateFormatter.format(new Date(data.signIn.google.linkedAt))}
							</p>

							<div class="pt-2">
								{#if data.signIn.hasPassword}
									<Button
										type="button"
										variant="outline"
										size="sm"
										onclick={() => (unlinkOpen = true)}
									>
										Desconectar Google
									</Button>
								{:else}
									<p class="text-muted-foreground text-xs">
										Para desconectar Google, primero crea una contraseña.
									</p>
								{/if}
							</div>
						{:else}
							<p class="text-muted-foreground text-sm">No conectado</p>
						{/if}
					</div>
				</div>

				{#if data.signIn.google}
					<form
						id="unlink-google"
						method="POST"
						action="?/unlinkGoogle"
						use:enhance={unlinking.submit({ onSettled: () => (unlinkOpen = false) })}
					></form>

					<ConfirmDialog
						bind:open={unlinkOpen}
						title="¿Desconectar Google?"
						description="Ya no podrás entrar con Google. Seguirás entrando con tu correo y contraseña."
						confirmLabel="Desconectar"
						pendingLabel="Desconectando…"
						variant="destructive"
						form="unlink-google"
						pending={unlinking.pending}
					/>
				{/if}
			</section>
		{/if}

		<section class="border-border bg-card rounded-lg border p-6">
			{#if data.signIn?.hasPassword === false}
				<h2 class="mb-2 text-lg">Crear contraseña</h2>
				<p class="text-muted-foreground mb-4 text-sm">
					Por ahora entras solo con Google. Con una contraseña también entras con tu correo.
				</p>

				<form
					bind:this={creationForm}
					method="POST"
					action="?/setPassword"
					class="space-y-4"
					use:enhance={creation.submit({ reset: false, onSuccess: () => creationForm?.reset() })}
				>
					<PasswordField
						name="password"
						label="Contraseña"
						hint={`Mínimo ${PASSWORD_MIN} caracteres.`}
						required
						minlength={PASSWORD_MIN}
					/>

					<PasswordField name="confirm" label="Repítela" required />

					<Button type="submit" disabled={creation.pending}>
						{creation.pending ? 'Creando…' : 'Crear contraseña'}
					</Button>
				</form>
			{:else}
				<h2 class="mb-4 text-lg">Cambiar contraseña</h2>

				<form
					bind:this={passwordForm}
					method="POST"
					action="?/password"
					class="space-y-4"
					use:enhance={submission.submit({ reset: false, onSuccess: () => passwordForm?.reset() })}
				>
					<PasswordField
						name="currentPassword"
						label="Contraseña actual"
						required
						autocomplete="current-password"
					/>

					<PasswordField
						name="password"
						label="Contraseña nueva"
						hint={`Mínimo ${PASSWORD_MIN} caracteres.`}
						required
						minlength={PASSWORD_MIN}
					/>

					<PasswordField name="confirm" label="Repítela" required />

					<Button type="submit" disabled={submission.pending}>
						{submission.pending ? 'Guardando…' : 'Cambiar contraseña'}
					</Button>
				</form>
			{/if}
		</section>

		<section class="border-border bg-card rounded-lg border p-6">
			<h2 class="mb-4 text-lg">Tus tiendas</h2>

			<ul class="divide-border divide-y">
				{#each data.stores as store (store.id)}
					<li class="flex items-center justify-between gap-4 py-3">
						<div class="min-w-0">
							<p class="flex items-center gap-2 truncate">
								{store.name}
								{#if store.id === data.activeStoreId}
									<Badge>Abierta</Badge>
								{/if}
							</p>
							<a
								href={store.url}
								target="_blank"
								rel="noopener noreferrer"
								class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
							>
								{MEMBER_ROLE_LABEL[store.role]} · ver tienda
								<ExternalLink class="size-3" />
							</a>
						</div>

						{#if store.id !== data.activeStoreId}
							<form method="POST" action="?/switchStore" use:enhance>
								<input type="hidden" name="storeId" value={store.id} />
								<Button type="submit" variant="outline" size="sm">Administrar</Button>
							</form>
						{/if}
					</li>
				{/each}
			</ul>

			<p class="text-muted-foreground mt-4 text-xs">
				¿Otra tienda? <a href="/signup" class="underline">Crea una nueva</a>.
			</p>
		</section>
	</div>
</PageTemplate>
