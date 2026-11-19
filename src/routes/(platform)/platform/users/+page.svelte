<script lang="ts">
	// Tipos
	import type { PageData } from './$types';

	// Iconos
	import Search from '@lucide/svelte/icons/search';

	// App
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	// Componentes
	import { Badge } from '$lib/components/atoms/badge';
	import { Input } from '$lib/components/atoms/input';
	import * as Table from '$lib/components/atoms/table';
	import SelectField from '$lib/components/molecules/SelectField.svelte';
	import UserStatusBadge from '$lib/components/molecules/UserStatusBadge.svelte';
	import PageTemplate from '$lib/components/templates/PageTemplate.svelte';

	// Dominio
	import { MEMBER_ROLE_LABEL, USER_STATUS_LABEL } from '$lib/domain/account';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const statusOptions = [
		{ value: 'all', label: 'Todas' },
		...Object.entries(USER_STATUS_LABEL).map(([value, label]) => ({ value, label }))
	];

	const dateFormatter = new Intl.DateTimeFormat('es-CO', {
		dateStyle: 'medium',
		timeZone: 'America/Bogota'
	});

	function formatDate(value: string | null): string {
		return value ? dateFormatter.format(new Date(value)) : 'Nunca';
	}

	function signInMethods(user: PageData['users'][number]): string {
		const methods = [user.has_password ? 'Contraseña' : null, user.has_google ? 'Google' : null];

		return methods.filter((method) => method !== null).join(' · ') || '—';
	}

	function applyFilter(name: string, value: string | null): void {
		const url = new URL(page.url);

		if (value) url.searchParams.set(name, value);
		else url.searchParams.delete(name);

		goto(url, { keepFocus: true, noScroll: true });
	}
</script>

<svelte:head>
	<title>Cuentas — Plataforma Globerce</title>
</svelte:head>

<PageTemplate
	title="Cuentas"
	description="{data.users.length} {data.users.length === 1
		? 'cuenta'
		: 'cuentas'} con este filtro."
>
	<section
		class="border-border bg-card rounded-lg mb-6 grid gap-3 border p-4 sm:grid-cols-[1fr_14rem]"
	>
		<form
			class="relative"
			onsubmit={(event) => {
				event.preventDefault();
				const value = new FormData(event.currentTarget).get('q');
				applyFilter('q', typeof value === 'string' && value.trim() ? value.trim() : null);
			}}
		>
			<Search class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
			<Input
				name="q"
				value={data.filters.q ?? ''}
				placeholder="Correo, nombre o tienda"
				class="pl-9"
				aria-label="Buscar cuentas"
			/>
		</form>

		<SelectField
			name="status"
			aria-label="Estado"
			value={data.filters.status ?? 'all'}
			options={statusOptions}
			onValueChange={(value) => applyFilter('status', value === 'all' ? null : value)}
		/>
	</section>

	{#if data.users.length === 0}
		<p
			class="text-muted-foreground border-border border border-dashed px-6 py-16 text-center text-sm"
		>
			Ninguna cuenta coincide.
		</p>
	{:else}
		<div class="border-border bg-card overflow-hidden rounded-lg border">
			<Table.Root class="table-stack">
				<Table.Header>
					<Table.Row>
						<Table.Head>Cuenta</Table.Head>
						<Table.Head>Estado</Table.Head>
						<Table.Head>Tiendas</Table.Head>
						<Table.Head>Entra con</Table.Head>
						<Table.Head>Última sesión</Table.Head>
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{#each data.users as user (user.id)}
						<Table.Row>
							<Table.Cell data-label="Cuenta" class="max-w-64">
								<a
									href={`/platform/users/${user.id}`}
									class="block truncate font-medium hover:underline"
								>
									{user.email}
								</a>
								{#if user.full_name}
									<p class="text-muted-foreground truncate text-xs">{user.full_name}</p>
								{/if}
							</Table.Cell>
							<Table.Cell data-label="Estado">
								<span class="flex flex-wrap gap-1">
									<UserStatusBadge disabled={user.disabled_at !== null} />
									{#if user.is_platform_admin}
										<Badge variant="outline">Plataforma</Badge>
									{/if}
								</span>
							</Table.Cell>
							<Table.Cell data-label="Tiendas" class="text-sm">
								{#if user.memberships.length === 0}
									<span class="text-muted-foreground">Sin tiendas</span>
								{:else}
									<ul>
										{#each user.memberships as membership (membership.store_id)}
											<li class="truncate">
												{membership.store_name}
												<span class="text-muted-foreground"
													>· {MEMBER_ROLE_LABEL[membership.role]}</span
												>
											</li>
										{/each}
									</ul>
								{/if}
							</Table.Cell>
							<Table.Cell data-label="Entra con" class="text-sm">{signInMethods(user)}</Table.Cell>
							<Table.Cell data-label="Última sesión" class="text-sm">
								{formatDate(user.last_sign_in_at)}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{/if}
</PageTemplate>
