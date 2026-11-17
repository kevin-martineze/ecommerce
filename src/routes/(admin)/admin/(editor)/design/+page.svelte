<script lang="ts">
	// Tipos
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { DraftHighlight } from '$lib/domain/preview';
	import type { PageData } from './$types';

	// Svelte
	import { tick, untrack } from 'svelte';

	// Iconos
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Monitor from '@lucide/svelte/icons/monitor';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	// App
	import { enhance } from '$app/forms';
	import { beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';

	// Componentes
	import { Badge } from '$lib/components/atoms/badge';
	import { Button } from '$lib/components/atoms/button';
	import { Input } from '$lib/components/atoms/input';
	import { Label } from '$lib/components/atoms/label';
	import { Textarea } from '$lib/components/atoms/textarea';
	import ActionToasts from '$lib/components/molecules/ActionToasts.svelte';
	import ChangeList from '$lib/components/molecules/ChangeList.svelte';
	import CheckboxField from '$lib/components/molecules/CheckboxField.svelte';
	import ConfirmDialog from '$lib/components/molecules/ConfirmDialog.svelte';
	import DraftPreview from '$lib/components/molecules/DraftPreview.svelte';
	import NumberField from '$lib/components/molecules/NumberField.svelte';
	import SelectField from '$lib/components/molecules/SelectField.svelte';
	import ConfirmDeleteDialog from '$lib/components/organisms/ConfirmDeleteDialog.svelte';
	import EditableRowCard from '$lib/components/organisms/EditableRowCard.svelte';
	import ThemeControls from '$lib/components/organisms/ThemeControls.svelte';

	// Estado
	import { DeleteConfirm } from '$lib/utils/delete-confirm.svelte';

	// Dominio
	import { describeDesignChanges, type DesignSnapshot } from '$lib/domain/design-changes';
	import { armarBorrador, focoDe, type Seccion, seccionDe } from '$lib/domain/diseno';
	import { destinoDeZona, type EditableZoneName } from '$lib/domain/editable-zones';
	import { accentProblem, isEmptyTheme } from '$lib/domain/theme';

	// Utilidades
	import { themePreviewUrl } from '$lib/template-preview';
	import { cn } from '$lib/utils';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const SECCIONES_TABS: { id: Seccion; label: string }[] = [
		{ id: 'estilo', label: 'Estilo' },
		{ id: 'marca', label: 'Marca' },
		{ id: 'portada', label: 'Portada' }
	];

	/** La sección que se ve sale de la URL: así se puede volver a ella y compartirla. */
	const seccion = $derived(seccionDe(page.url.search));

	// Copia editable de lo guardado. Un solo Guardar envía todo lo escalar junto.
	let template = $state(untrack(() => data.settings.template));
	let accent = $state(untrack(() => data.settings.theme.accent ?? ''));
	let fonts = $state(untrack(() => data.settings.theme.fonts ?? ''));
	let corners = $state(untrack(() => data.settings.theme.corners ?? ''));
	let hero = $state(untrack(() => data.settings.theme.hero ?? ''));
	let storeName = $state(untrack(() => data.settings.store_name));
	let announcement = $state(untrack(() => data.settings.announcement ?? ''));
	let heroCollectionId = $state(untrack(() => data.settings.hero_collection_id ?? ''));
	let heroTitle = $state(untrack(() => data.settings.hero_title ?? ''));
	let heroSubtitle = $state(untrack(() => data.settings.hero_subtitle ?? ''));

	/** Cuando la dueña entra a la lista de mensajes, la vista previa resalta esa zona. */
	let enMensajes = $state(false);

	let device = $state<'desktop' | 'mobile'>('desktop');
	let path = $state('/');
	let saving = $state(false);

	const PAGES = [
		{ path: '/', label: 'Portada' },
		{ path: '/shop', label: 'Catálogo' }
	];

	// Los mensajes de abajo: cambios guardados por bloque, con lo que se va escribiendo encima.
	interface HighlightEdit {
		eyebrow?: string;
		title?: string;
		body?: string;
		sortOrder?: number;
		active?: boolean;
	}

	let highlightEdits = $state<Record<string, HighlightEdit>>({});

	let newEyebrow = $state('');
	let newTitle = $state('');
	let newBody = $state('');
	let newOrder = $state(
		untrack(
			() => data.highlights.reduce((max, highlight) => Math.max(max, highlight.sort_order), 0) + 1
		)
	);
	let newActive = $state(true);

	const rows = $derived(
		data.highlights.map((highlight) => ({
			id: highlight.id,
			eyebrow: highlightEdits[highlight.id]?.eyebrow ?? highlight.eyebrow,
			title: highlightEdits[highlight.id]?.title ?? highlight.title,
			body: highlightEdits[highlight.id]?.body ?? highlight.body,
			sortOrder: highlightEdits[highlight.id]?.sortOrder ?? highlight.sort_order,
			active: highlightEdits[highlight.id]?.active ?? highlight.active
		}))
	);

	/** El bloque que se está creando también se ve, sin esperar a guardarlo. */
	const draftHighlights = $derived<DraftHighlight[]>([
		...rows,
		...(newEyebrow.trim() || newTitle.trim() || newBody.trim()
			? [
					{
						id: 'nuevo',
						eyebrow: newEyebrow,
						title: newTitle,
						body: newBody,
						sortOrder: newOrder,
						active: newActive
					}
				]
			: [])
	]);

	function editHighlight(id: string, patch: HighlightEdit) {
		highlightEdits[id] = { ...highlightEdits[id], ...patch };
	}

	/** El bloque que se quiere borrar; el diálogo dice cuál es antes de enviar. */
	const borrado = new DeleteConfirm();
	const alBorrar = borrado.enhance();

	const collectionOptions = $derived([
		{ value: '', label: 'Ninguna: usar mi propio título' },
		...data.collections.map((collection) => ({ value: collection.id, label: collection.name }))
	]);

	const chosenCollection = $derived(
		data.collections.find((collection) => collection.id === heroCollectionId) ?? null
	);

	/** Lo que la vista previa muestra: un solo borrador con todo, y la zona de la sección. */
	const draft = $derived(
		armarBorrador({
			template,
			accent,
			fonts,
			corners,
			hero,
			storeName,
			announcement,
			heroCollectionId,
			heroTitle,
			heroSubtitle,
			highlights: draftHighlights,
			foco: enMensajes && seccion === 'portada' ? 'highlights' : focoDe(seccion)
		})
	);

	const saved = $derived(data.settings);

	const guardadoSnap = $derived<DesignSnapshot>({
		template: saved.template,
		accent: saved.theme.accent ?? '',
		fonts: saved.theme.fonts ?? '',
		corners: saved.theme.corners ?? '',
		hero: saved.theme.hero ?? '',
		storeName: saved.store_name,
		announcement: saved.announcement ?? '',
		heroCollectionId: saved.hero_collection_id ?? '',
		heroTitle: saved.hero_title ?? '',
		heroSubtitle: saved.hero_subtitle ?? ''
	});

	const borradorSnap = $derived<DesignSnapshot>({
		template,
		accent,
		fonts,
		corners,
		hero,
		storeName,
		announcement,
		heroCollectionId,
		heroTitle,
		heroSubtitle
	});

	/** Los diálogos de Guardar y Descartar. */
	let guardarAbierto = $state(false);
	let descartarAbierto = $state(false);

	const plural = (n: number) => (n === 1 ? 'cambio' : 'cambios');

	/** Las diferencias con lo guardado, en el orden de las secciones. */
	const cambios = $derived(describeDesignChanges(guardadoSnap, borradorSnap, data.collections));

	/** Hay cambios escalares sin guardar. Los mensajes y el logo no cuentan: se guardan solos. */
	const changed = $derived(cambios.length > 0);

	const invalid = $derived(accentProblem(template, accent) !== null);

	/**
	 * La vista previa carga con lo guardado y el borrador le llega por mensaje;
	 * la URL solo cambia al cambiar de página, así no se recarga con cada cambio.
	 */
	const previewSrc = $derived(
		themePreviewUrl(new URL(path, data.previewUrl).toString(), saved.template, saved.theme)
	);

	/**
	 * Un clic en una zona editable de la vista previa: abre la sección de Diseño
	 * que la edita, sin tocar el borrador, y enfoca el campo con un pulso breve.
	 */
	async function editarZona(zona: EditableZoneName) {
		const destino = destinoDeZona(zona);

		await goto(destino.url, { replaceState: true, keepFocus: true, noScroll: true });
		await tick();

		if (!destino.campo) return;

		const campo = document.getElementById(destino.campo);

		if (!campo) return;

		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		campo.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
		campo.focus({ preventScroll: true });
		campo.classList.add('pulso-edicion');
		window.setTimeout(() => campo.classList.remove('pulso-edicion'), 1000);
	}

	function discard() {
		template = saved.template;
		accent = saved.theme.accent ?? '';
		fonts = saved.theme.fonts ?? '';
		corners = saved.theme.corners ?? '';
		hero = saved.theme.hero ?? '';
		storeName = saved.store_name;
		announcement = saved.announcement ?? '';
		heroCollectionId = saved.hero_collection_id ?? '';
		heroTitle = saved.hero_title ?? '';
		heroSubtitle = saved.hero_subtitle ?? '';
	}

	function clearAdjustments() {
		accent = '';
		fonts = '';
		corners = '';
		hero = '';
	}

	/**
	 * El Guardar envía todo lo escalar desde el estado, no desde los campos: así
	 * una sección cerrada no pierde lo que la dueña escribió en ella.
	 */
	const alGuardar: SubmitFunction = ({ formData }) => {
		formData.set('template', template);
		formData.set('accent', accent);
		formData.set('fonts', fonts);
		formData.set('corners', corners);
		formData.set('hero', hero);
		formData.set('storeName', storeName);
		formData.set('announcement', announcement);
		formData.set('heroCollectionId', heroCollectionId);
		formData.set('heroTitle', heroTitle);
		formData.set('heroSubtitle', heroSubtitle);

		saving = true;

		return async ({ update }) => {
			await update({ reset: false });
			saving = false;
			guardarAbierto = false;
		};
	};

	// Salir con cambios sin guardar los perdería: se pregunta antes. Cambiar de
	// sección no es salir: va por la URL de la misma página.
	beforeNavigate(({ to, cancel }) => {
		if (to?.url.pathname === page.url.pathname) return;

		if (
			changed &&
			!saving &&
			!confirm(
				`Tienes ${cambios.length} ${plural(cambios.length)} sin guardar. ¿Salir sin guardarlos?`
			)
		) {
			cancel();
		}
	});
</script>

<svelte:head>
	<title>Diseño de tu tienda — Globerce</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin-shell bg-background text-foreground flex flex-col lg:h-screen">
	<header
		class="border-border flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2.5 lg:flex-nowrap"
	>
		<Button href="/admin" variant="ghost" size="sm">
			<ArrowLeft />
			Salir
		</Button>

		<div class="min-w-0">
			<h1 class="truncate text-base">Diseño de tu tienda</h1>
			<p class="text-muted-foreground truncate text-xs">
				{data.settings.store_name}
				{#if changed}· <span class="text-foreground">Cambios sin guardar</span>{/if}
			</p>
		</div>

		<div class="ml-auto flex items-center gap-1">
			<div class="bg-muted flex rounded-md p-0.5" role="group" aria-label="Página que ves">
				{#each PAGES as option (option.path)}
					<button
						type="button"
						class={cn(
							'rounded px-2.5 py-1 text-xs transition-colors',
							path === option.path
								? 'bg-background text-foreground shadow-xs'
								: 'text-muted-foreground hover:text-foreground'
						)}
						aria-pressed={path === option.path}
						onclick={() => (path = option.path)}
					>
						{option.label}
					</button>
				{/each}
			</div>

			<div class="bg-muted flex rounded-md p-0.5" role="group" aria-label="Pantalla">
				<button
					type="button"
					class={cn(
						'rounded p-1.5 transition-colors',
						device === 'desktop'
							? 'bg-background text-foreground shadow-xs'
							: 'text-muted-foreground hover:text-foreground'
					)}
					aria-pressed={device === 'desktop'}
					aria-label="Ver en computador"
					title="Computador"
					onclick={() => (device = 'desktop')}
				>
					<Monitor class="size-4" />
				</button>
				<button
					type="button"
					class={cn(
						'rounded p-1.5 transition-colors',
						device === 'mobile'
							? 'bg-background text-foreground shadow-xs'
							: 'text-muted-foreground hover:text-foreground'
					)}
					aria-pressed={device === 'mobile'}
					aria-label="Ver en celular"
					title="Celular"
					onclick={() => (device = 'mobile')}
				>
					<Smartphone class="size-4" />
				</button>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<Button href={data.storeUrl} target="_blank" rel="noopener" variant="ghost" size="sm">
				Ver mi tienda
				<ExternalLink />
			</Button>
			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={!changed || saving}
				onclick={() => (descartarAbierto = true)}
			>
				Descartar
			</Button>
			<Button
				type="button"
				size="sm"
				disabled={!changed || invalid || saving}
				onclick={() => (guardarAbierto = true)}
			>
				{saving ? 'Guardando…' : 'Guardar'}
			</Button>
		</div>
	</header>

	<div class="grid min-h-0 flex-1 lg:grid-cols-[22rem_minmax(0,1fr)]">
		<aside class="border-border min-h-0 overflow-y-auto border-b lg:border-r lg:border-b-0">
			<nav class="border-border flex gap-1 border-b p-2" aria-label="Secciones de Diseño">
				{#each SECCIONES_TABS as tab (tab.id)}
					<a
						href="?seccion={tab.id}"
						aria-current={seccion === tab.id ? 'page' : undefined}
						class={cn(
							'flex-1 rounded-md px-2 py-1.5 text-center text-sm transition-colors',
							seccion === tab.id
								? 'bg-muted text-foreground font-medium'
								: 'text-muted-foreground hover:text-foreground'
						)}
						onclick={() => (enMensajes = false)}
					>
						{tab.label}
					</a>
				{/each}
			</nav>

			{#if seccion === 'estilo'}
				<ThemeControls bind:template bind:accent bind:fonts bind:corners bind:hero />

				<div class="border-border border-t p-5">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						class="text-muted-foreground"
						disabled={isEmptyTheme(draft.theme)}
						onclick={clearAdjustments}
					>
						<RotateCcw />
						Quitar mis ajustes
					</Button>
					<p class="text-muted-foreground mt-1 px-3 text-xs">
						Deja la plantilla como viene. Se aplica al guardar.
					</p>
				</div>
			{:else if seccion === 'marca'}
				<div class="space-y-6 p-5">
					<div class="space-y-2">
						<Label for="storeName">Nombre de la tienda</Label>
						<Input id="storeName" bind:value={storeName} required maxlength={80} />
					</div>

					<div class="space-y-2">
						<Label for="announcement">Barra de anuncio</Label>
						<Textarea
							id="announcement"
							rows={2}
							maxlength={160}
							bind:value={announcement}
							placeholder="Envío gratis por compras sobre $250.000"
						/>
						<p class="text-muted-foreground text-xs">Déjalo vacío para ocultar la barra.</p>
					</div>

					<div class="border-border space-y-3 border-t pt-5">
						<div class="flex items-center justify-between gap-2">
							<h2 class="text-sm font-semibold">Logo</h2>
							<Badge variant="outline">Se guarda al instante</Badge>
						</div>
						<p class="text-muted-foreground text-xs">
							Si subes un logo, la tienda lo muestra en vez del nombre: en la cabecera, en el menú y
							en el pie.
						</p>

						{#if data.settings.logo_url}
							<div class="grid place-items-center rounded-md bg-white p-4">
								<img
									src={data.settings.logo_url}
									alt={data.settings.store_name}
									class="h-16 w-auto max-w-full object-contain"
								/>
							</div>
						{:else}
							<p class="text-muted-foreground text-sm">
								Todavía no tienes logo: la tienda muestra el nombre.
							</p>
						{/if}

						<form
							method="POST"
							action="?/uploadLogo"
							enctype="multipart/form-data"
							class="space-y-3"
							use:enhance
						>
							<Label for="logo">Archivo del logo</Label>
							<Input
								id="logo"
								name="file"
								type="file"
								accept="image/png,image/jpeg,image/webp,image/svg+xml"
								required
							/>
							<p class="text-muted-foreground text-xs">
								Mejor en PNG o SVG con fondo transparente, horizontal. Máximo 2 MB.
							</p>
							<Button type="submit" size="sm">Subir logo</Button>
						</form>

						{#if data.settings.logo_url}
							<Button
								type="button"
								variant="ghost"
								size="sm"
								class="text-destructive"
								onclick={() =>
									borrado.ask('quitar-logo', '¿Quitar el logo?', {
										description: 'La tienda vuelve a mostrar el nombre.',
										confirmLabel: 'Quitar',
										pendingLabel: 'Quitando…'
									})}
							>
								<Trash2 class="size-3" />
								Quitar logo
							</Button>
						{/if}
					</div>
				</div>
			{:else}
				<div class="space-y-6 p-5">
					<div class="space-y-3">
						<h2 class="text-sm font-semibold">Imagen de arriba</h2>
						<p class="text-muted-foreground text-xs">
							Elige una colección para que su foto y su nombre encabecen la tienda. Si no eliges
							ninguna, se usan el título y el texto que escribas aquí.
						</p>

						<div class="space-y-2">
							<Label for="heroCollectionId">Colección destacada</Label>
							<SelectField
								id="heroCollectionId"
								name="heroCollectionId"
								bind:value={heroCollectionId}
								placeholder="Ninguna: usar mi propio título"
								options={collectionOptions}
							/>

							{#if chosenCollection}
								<div class="flex items-center gap-3 pt-1">
									{#if chosenCollection.hero_image_url}
										<img
											src={chosenCollection.hero_image_url}
											alt=""
											class="bg-muted h-16 w-24 object-cover"
										/>
									{/if}
									<p class="text-muted-foreground text-xs">
										Se muestran la foto, el nombre y la descripción de esta colección.
										{#if !chosenCollection.active}
											<Badge variant="outline" class="ml-2">Está oculta en la tienda</Badge>
										{/if}
									</p>
								</div>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="heroTitle">Título propio</Label>
							<Input
								id="heroTitle"
								bind:value={heroTitle}
								maxlength={120}
								placeholder="Productos que duran más de una temporada"
								disabled={chosenCollection !== null}
							/>
						</div>

						<div class="space-y-2">
							<Label for="heroSubtitle">Texto de apoyo</Label>
							<Textarea
								id="heroSubtitle"
								rows={2}
								maxlength={300}
								bind:value={heroSubtitle}
								placeholder="Selección corta, materiales nobles y variaciones reales."
								disabled={chosenCollection !== null}
							/>
						</div>
					</div>

					<div
						class="border-border space-y-4 border-t pt-5"
						id="mensajes-de-abajo"
						role="group"
						aria-label="Mensajes de abajo"
						onfocusin={() => (enMensajes = true)}
					>
						<div class="flex items-center justify-between gap-2">
							<h2 class="text-sm font-semibold">Mensajes de abajo</h2>
							<Badge variant="outline">Se guarda al instante</Badge>
						</div>
						<p class="text-muted-foreground text-xs">
							{data.highlights.length} bloques · se muestran en el orden que definas
						</p>

						<form
							method="POST"
							action="?/createBlock"
							class="bg-muted/50 grid gap-3 rounded-lg p-4"
							use:enhance
						>
							<div class="grid grid-cols-2 gap-3">
								<div class="space-y-1.5">
									<Label class="text-xs" for="new-eyebrow">Etiqueta</Label>
									<Input
										id="new-eyebrow"
										name="eyebrow"
										required
										placeholder="Cambios"
										bind:value={newEyebrow}
									/>
								</div>
								<div class="space-y-1.5">
									<Label class="text-xs" for="new-title">Título</Label>
									<Input
										id="new-title"
										name="title"
										required
										placeholder="Cambia sin problema"
										bind:value={newTitle}
									/>
								</div>
							</div>

							<div class="space-y-1.5">
								<Label class="text-xs" for="new-body">Texto</Label>
								<Textarea
									id="new-body"
									name="body"
									required
									rows={2}
									maxlength={300}
									placeholder="Tienes 8 días para cambiar tu producto."
									bind:value={newBody}
								/>
							</div>

							<div class="flex flex-wrap items-end gap-4">
								<div class="space-y-1.5">
									<Label class="text-xs" for="new-order">Orden</Label>
									<NumberField
										id="new-order"
										name="sortOrder"
										bind:value={newOrder}
										max={999}
										class="w-32"
									/>
								</div>
								<div class="pb-2">
									<CheckboxField
										id="nuevo-bloque-visible"
										name="active"
										label="Visible"
										bind:checked={newActive}
									/>
								</div>
								<Button type="submit" size="sm" class="ml-auto">Agregar mensaje</Button>
							</div>
						</form>

						{#if rows.length > 0}
							<div class="space-y-4">
								{#each rows as highlight (highlight.id)}
									<EditableRowCard>
										<div class="grid gap-4">
											<div class="grid grid-cols-2 gap-3">
												<div class="space-y-1.5">
													<Label for="eyebrow-{highlight.id}">Etiqueta</Label>
													<Input
														id="eyebrow-{highlight.id}"
														form="bloque-{highlight.id}"
														name="eyebrow"
														value={highlight.eyebrow}
														oninput={(event) =>
															editHighlight(highlight.id, { eyebrow: event.currentTarget.value })}
													/>
												</div>
												<div class="space-y-1.5">
													<Label for="title-{highlight.id}">Título</Label>
													<Input
														id="title-{highlight.id}"
														form="bloque-{highlight.id}"
														name="title"
														value={highlight.title}
														oninput={(event) =>
															editHighlight(highlight.id, { title: event.currentTarget.value })}
													/>
												</div>
											</div>

											<div class="space-y-1.5">
												<Label for="body-{highlight.id}">Texto</Label>
												<Textarea
													id="body-{highlight.id}"
													form="bloque-{highlight.id}"
													name="body"
													rows={2}
													maxlength={300}
													value={highlight.body}
													oninput={(event) =>
														editHighlight(highlight.id, { body: event.currentTarget.value })}
												/>
											</div>

											<div class="flex flex-wrap items-end gap-4">
												<div class="space-y-1.5">
													<Label for="order-{highlight.id}">Orden</Label>
													<NumberField
														id="order-{highlight.id}"
														form="bloque-{highlight.id}"
														name="sortOrder"
														value={highlight.sortOrder}
														max={999}
														class="w-32"
														onchange={(value) => editHighlight(highlight.id, { sortOrder: value })}
													/>
												</div>
												<div class="pb-2">
													<CheckboxField
														id="bloque-visible-{highlight.id}"
														form="bloque-{highlight.id}"
														name="active"
														label="Visible"
														checked={highlight.active}
														onchange={(checked) => editHighlight(highlight.id, { active: checked })}
													/>
												</div>
											</div>
										</div>

										{#snippet acciones()}
											<Button
												type="submit"
												form="bloque-{highlight.id}"
												size="sm"
												variant="outline"
											>
												Guardar
											</Button>

											<Button
												type="button"
												size="sm"
												variant="ghost"
												class="text-destructive"
												aria-label="Borrar mensaje"
												onclick={() =>
													borrado.ask(
														`borrar-bloque-${highlight.id}`,
														`¿Borrar el mensaje «${highlight.title}»?`,
														{
															description: 'Se quita de la portada. No se puede deshacer.'
														}
													)}
											>
												<Trash2 class="size-3" />
												Borrar
											</Button>
										{/snippet}
									</EditableRowCard>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</aside>

		<section class="bg-muted/60 h-[75vh] min-h-0 p-4 lg:h-auto lg:p-6">
			<DraftPreview
				src={previewSrc}
				{draft}
				{device}
				title="Vista previa de tu tienda"
				onedit={editarZona}
			/>
		</section>
	</div>
</div>

<ConfirmDialog
	bind:open={guardarAbierto}
	title="¿Guardar {cambios.length} {plural(cambios.length)} en tu tienda?"
	confirmLabel="Guardar cambios"
	pendingLabel="Guardando…"
	form="diseno"
	pending={saving}
>
	<ChangeList {cambios} />
	<p class="text-muted-foreground text-xs">Se publica en tu tienda al guardar.</p>
</ConfirmDialog>

<ConfirmDialog
	bind:open={descartarAbierto}
	title="¿Descartar {cambios.length} {plural(cambios.length)} sin guardar?"
	confirmLabel="Descartar"
	cancelLabel="Seguir editando"
	variant="destructive"
	onconfirm={() => {
		discard();
		descartarAbierto = false;
	}}
>
	<ChangeList {cambios} modo="descartar" />
</ConfirmDialog>

<ActionToasts />

<!-- Lo escalar se guarda con un solo Guardar: el botón del encabezado envía este form. -->
<form id="diseno" method="POST" action="?/save" use:enhance={alGuardar} hidden></form>

<!-- Los bloques de abajo: cada uno tiene su form, referenciado por id desde sus botones. -->
<div hidden>
	{#each data.highlights as highlight (highlight.id)}
		<form id="bloque-{highlight.id}" method="POST" action="?/updateBlock" use:enhance>
			<input type="hidden" name="id" value={highlight.id} />
		</form>

		<form
			id="borrar-bloque-{highlight.id}"
			method="POST"
			action="?/deleteBlock"
			use:enhance={alBorrar}
		>
			<input type="hidden" name="id" value={highlight.id} />
		</form>
	{/each}

	<form id="quitar-logo" method="POST" action="?/removeLogo" use:enhance={alBorrar}></form>
</div>

<ConfirmDeleteDialog
	bind:open={borrado.open}
	title={borrado.target?.title ?? ''}
	description={borrado.target?.description}
	form={borrado.target?.formId ?? ''}
	confirmLabel={borrado.target?.confirmLabel}
	pendingLabel={borrado.target?.pendingLabel}
	pending={borrado.pending}
/>
