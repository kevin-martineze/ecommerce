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
	import PasswordField from '$lib/components/molecules/PasswordField.svelte';
	import PageTemplate from '$lib/components/templates/PageTemplate.svelte';

	// Estado
	import { FormState } from '$lib/utils/form-state.svelte';

	// Dominio
	import { MEMBER_ROLE_LABEL } from '$lib/domain/account';
	import { PASSWORD_MIN } from '$lib/schemas/account';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const submission = new FormState();
	let passwordForm = $state<HTMLFormElement>();
</script>

<svelte:head>
	<title>Mi cuenta — Globerce</title>
</svelte:head>

<PageTemplate
	title="Mi cuenta"
	description="{data.user.full_name ?? data.user.email} · {data.user.email}"
>
	<div class="grid gap-6 lg:grid-cols-2">
		<section class="border-border bg-card rounded-lg border p-6">
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
