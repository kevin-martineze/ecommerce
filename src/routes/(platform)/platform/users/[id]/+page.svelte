<script lang="ts">
	// Tipos
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { PageData } from './$types';

	// Librerías
	import { toast } from 'svelte-sonner';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { Badge } from '$lib/components/atoms/badge';
	import { Button } from '$lib/components/atoms/button';
	import StoreStatusBadge from '$lib/components/molecules/StoreStatusBadge.svelte';
	import TypedConfirmDialog from '$lib/components/molecules/TypedConfirmDialog.svelte';
	import UserStatusBadge from '$lib/components/molecules/UserStatusBadge.svelte';
	import ConfirmDeleteDialog from '$lib/components/organisms/ConfirmDeleteDialog.svelte';
	import PageTemplate from '$lib/components/templates/PageTemplate.svelte';

	// Estado
	import { DeleteConfirm } from '$lib/utils/delete-confirm.svelte';

	// Dominio
	import { MEMBER_ROLE_LABEL } from '$lib/domain/account';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const user = $derived(data.user);
	const disabled = $derived(user.disabled_at !== null);

	const dateFormatter = new Intl.DateTimeFormat('es-CO', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'America/Bogota'
	});

	function formatDate(value: string | null): string {
		return value ? dateFormatter.format(new Date(value)) : 'Nunca';
	}

	const statusConfirm = new DeleteConfirm();
	const onStatus = statusConfirm.enhance();

	let deleteOpen = $state(false);
	let deleting = $state(false);

	/** Al eliminar, la acción redirige al listado: el aviso va aquí porque no queda `form`. */
	const onDelete: SubmitFunction = () => {
		deleting = true;

		return async ({ result, update }) => {
			if (result.type === 'redirect') toast.success(`Eliminamos ${user.email}.`);

			await update();
			deleting = false;
			if (result.type !== 'redirect') deleteOpen = false;
		};
	};
</script>

<svelte:head>
	<title>{user.email} — Plataforma Globerce</title>
</svelte:head>

<PageTemplate
	title={user.full_name ?? user.email}
	description={user.full_name ? user.email : undefined}
	back={{ href: '/platform/users', label: 'Cuentas' }}
>
	{#snippet badge()}
		<UserStatusBadge {disabled} />
		{#if user.is_platform_admin}
			<Badge variant="outline">Plataforma</Badge>
		{/if}
	{/snippet}

	{#snippet actions()}
		{#if !user.is_platform_admin}
			<form id="user-status" method="POST" action="?/status" use:enhance={onStatus}>
				{#if disabled}
					<input type="hidden" name="disabled" value="false" />
					<Button type="submit" disabled={statusConfirm.pending}>Reactivar cuenta</Button>
				{:else}
					<input type="hidden" name="disabled" value="true" />
					<Button
						type="button"
						variant="outline"
						onclick={() =>
							statusConfirm.ask('user-status', `¿Deshabilitar ${user.email}?`, {
								description:
									'Se cierran todas sus sesiones y no podrá entrar hasta que la reactives. Sus tiendas siguen como están.',
								confirmLabel: 'Deshabilitar',
								pendingLabel: 'Deshabilitando…'
							})}
					>
						Deshabilitar
					</Button>
				{/if}
			</form>

			<form id="user-delete" method="POST" action="?/delete" use:enhance={onDelete}>
				{#each user.sole_owner_stores as store (store.id)}
					<input type="hidden" name="deleteStoreIds" value={store.id} />
				{/each}
				<Button type="button" variant="destructive" onclick={() => (deleteOpen = true)}>
					Eliminar cuenta
				</Button>
			</form>
		{/if}
	{/snippet}

	{#if user.is_platform_admin}
		<p class="bg-muted mb-6 p-4 text-sm">
			Esta cuenta administra la plataforma: no se deshabilita ni se elimina desde aquí.
		</p>
	{/if}

	<div class="grid gap-6 lg:grid-cols-2">
		<section class="border-border bg-card rounded-lg space-y-3 border p-6 text-sm">
			<h2 class="text-lg">Cuenta</h2>
			<dl class="space-y-2">
				<div class="flex justify-between gap-4">
					<dt class="text-muted-foreground">Entra con</dt>
					<dd>
						{[user.has_password ? 'Contraseña' : null, user.has_google ? 'Google' : null]
							.filter((method) => method !== null)
							.join(' · ') || '—'}
					</dd>
				</div>
				<div class="flex justify-between gap-4">
					<dt class="text-muted-foreground">Última sesión</dt>
					<dd>{formatDate(user.last_sign_in_at)}</dd>
				</div>
				<div class="flex justify-between gap-4">
					<dt class="text-muted-foreground">Creada</dt>
					<dd>{formatDate(user.created_at)}</dd>
				</div>
				{#if user.disabled_at}
					<div class="flex justify-between gap-4">
						<dt class="text-muted-foreground">Deshabilitada</dt>
						<dd>{formatDate(user.disabled_at)}</dd>
					</div>
				{/if}
			</dl>
		</section>

		<section class="border-border bg-card rounded-lg border p-6 text-sm">
			<h2 class="mb-3 text-lg">Tiendas</h2>
			{#if user.memberships.length === 0}
				<p class="text-muted-foreground">No pertenece a ninguna tienda.</p>
			{:else}
				<ul class="space-y-2">
					{#each user.memberships as membership (membership.store_id)}
						<li class="flex items-center justify-between gap-3">
							<a href={`/platform/stores/${membership.store_id}`} class="truncate hover:underline">
								{membership.store_name}
								<span class="text-muted-foreground">· {MEMBER_ROLE_LABEL[membership.role]}</span>
							</a>
							<StoreStatusBadge status={membership.store_status} />
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>

	<ConfirmDeleteDialog
		bind:open={statusConfirm.open}
		title={statusConfirm.target?.title ?? ''}
		description={statusConfirm.target?.description}
		form={statusConfirm.target?.formId ?? ''}
		confirmLabel={statusConfirm.target?.confirmLabel}
		pendingLabel={statusConfirm.target?.pendingLabel}
		pending={statusConfirm.pending}
	/>

	<TypedConfirmDialog
		bind:open={deleteOpen}
		title={`¿Eliminar ${user.email}?`}
		description="No tiene vuelta atrás. La cuenta desaparece y no podrá volver a entrar con este correo hasta que cree otra."
		form="user-delete"
		name="confirmEmail"
		expected={user.email}
		label="Escribe el correo de la cuenta"
		confirmLabel="Eliminar cuenta"
		pending={deleting}
	>
		{#if user.sole_owner_stores.length > 0}
			<div class="border-destructive/40 bg-destructive/5 space-y-2 rounded-md border p-3 text-sm">
				<p class="font-medium">
					También se eliminan {user.sole_owner_stores.length === 1
						? 'esta tienda'
						: `estas ${user.sole_owner_stores.length} tiendas`}, porque es su única creadora:
				</p>
				<ul class="list-disc pl-5">
					{#each user.sole_owner_stores as store (store.id)}
						<li>{store.name} <span class="text-muted-foreground">({store.slug})</span></li>
					{/each}
				</ul>
				<p class="text-muted-foreground">
					Con sus productos, pedidos, fotos, pagos y dominio propio.
				</p>
			</div>
		{/if}
	</TypedConfirmDialog>
</PageTemplate>
