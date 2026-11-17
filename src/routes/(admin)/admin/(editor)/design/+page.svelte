<script lang="ts">
	// Tipos
	import type { PageData } from './$types';

	// Svelte
	import { tick } from 'svelte';

	// Iconos
	import ExternalLink from '@lucide/svelte/icons/external-link';

	// App
	import { enhance } from '$app/forms';
	import { beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import ActionToasts from '$lib/components/molecules/ActionToasts.svelte';
	import ChangeList from '$lib/components/molecules/ChangeList.svelte';
	import ConfirmDialog from '$lib/components/molecules/ConfirmDialog.svelte';
	import DeviceToggle from '$lib/components/molecules/DeviceToggle.svelte';
	import DraftPreview from '$lib/components/molecules/DraftPreview.svelte';
	import SegmentedControl from '$lib/components/molecules/SegmentedControl.svelte';
	import ConfirmDeleteDialog from '$lib/components/organisms/ConfirmDeleteDialog.svelte';
	import EditorTemplate from '$lib/components/templates/EditorTemplate.svelte';
	import BrandSection from './BrandSection.svelte';
	import CoverSection from './CoverSection.svelte';
	import StyleSection from './StyleSection.svelte';

	// Estado
	import { DeleteConfirm } from '$lib/utils/delete-confirm.svelte';
	import { countChanges, DesignEditor, PREVIEW_PAGES } from './design-editor.svelte';

	// Dominio
	import { type Section, sectionFrom } from '$lib/domain/design';
	import { type EditableZoneName, zoneTarget } from '$lib/domain/editable-zones';

	// Utilidades
	import { cn } from '$lib/utils';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const SECTION_TABS: { id: Section; label: string }[] = [
		{ id: 'style', label: 'Estilo' },
		{ id: 'brand', label: 'Marca' },
		{ id: 'cover', label: 'Portada' }
	];

	/** La sección que se ve sale de la URL: así se puede volver a ella y compartirla. */
	const section = $derived(sectionFrom(page.url.search));

	const editor = new DesignEditor(
		() => data,
		() => section
	);

	/** El bloque o el logo que se quiere borrar; el diálogo dice cuál es antes de enviar. */
	const deletion = new DeleteConfirm();
	const onDelete = deletion.enhance();

	/**
	 * Un clic en una zona editable de la vista previa: abre la sección de Diseño
	 * que la edita, sin tocar el borrador, y enfoca el campo con un pulso breve.
	 */
	async function editZone(zone: EditableZoneName) {
		const destinationZone = zoneTarget(zone);

		await goto(destinationZone.url, { replaceState: true, keepFocus: true, noScroll: true });
		await tick();

		if (!destinationZone.field) return;

		const field = document.getElementById(destinationZone.field);

		if (!field) return;

		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		field.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
		field.focus({ preventScroll: true });
		field.classList.add('pulso-edicion');
		window.setTimeout(() => field.classList.remove('pulso-edicion'), 1000);
	}

	// Salir con cambios sin guardar los perdería: se pregunta antes. Cambiar de
	// sección no es salir: va por la URL de la misma página.
	beforeNavigate(({ to, cancel }) => {
		if (to?.url.pathname === page.url.pathname) return;

		const warning = editor.leaveWarning();

		if (warning && !confirm(warning)) cancel();
	});
</script>

<svelte:head>
	<title>Diseño de tu tienda — Globerce</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EditorTemplate title="Diseño de tu tienda" exitHref="/admin">
	{#snippet subtitle()}
		{data.settings.store_name}
		{#if editor.changed}· <span class="text-foreground">Cambios sin guardar</span>{/if}
	{/snippet}

	{#snippet tools()}
		<SegmentedControl options={PREVIEW_PAGES} bind:value={editor.path} label="Página que ves" />
		<DeviceToggle bind:value={editor.device} />
	{/snippet}

	{#snippet actions()}
		<Button href={data.storeUrl} target="_blank" rel="noopener" variant="ghost" size="sm">
			Ver mi tienda
			<ExternalLink />
		</Button>
		<Button
			type="button"
			variant="outline"
			size="sm"
			disabled={!editor.changed || editor.saving}
			onclick={() => (editor.discardDialogOpen = true)}
		>
			Descartar
		</Button>
		<Button
			type="button"
			size="sm"
			disabled={!editor.changed || editor.invalid || editor.saving}
			onclick={() => (editor.saveDialogOpen = true)}
		>
			{editor.saving ? 'Guardando…' : 'Guardar'}
		</Button>
	{/snippet}

	{#snippet panel()}
		<nav class="border-border flex gap-1 border-b p-2" aria-label="Secciones de Diseño">
			{#each SECTION_TABS as tab (tab.id)}
				<a
					href="?section={tab.id}"
					aria-current={section === tab.id ? 'page' : undefined}
					class={cn(
						'flex-1 rounded-md px-2 py-1.5 text-center text-sm transition-colors',
						section === tab.id
							? 'bg-muted text-foreground font-medium'
							: 'text-muted-foreground hover:text-foreground'
					)}
					onclick={() => (editor.inMessages = false)}
				>
					{tab.label}
				</a>
			{/each}
		</nav>

		{#if section === 'style'}
			<StyleSection {editor} />
		{:else if section === 'brand'}
			<BrandSection {editor} logoUrl={data.settings.logo_url} {deletion} />
		{:else}
			<CoverSection {editor} {deletion} />
		{/if}
	{/snippet}

	<DraftPreview
		src={editor.previewSrc}
		draft={editor.draft}
		device={editor.device}
		title="Vista previa de tu tienda"
		onedit={editZone}
	/>
</EditorTemplate>

<ConfirmDialog
	bind:open={editor.saveDialogOpen}
	title="¿Guardar {countChanges(editor.changes.length)} en tu tienda?"
	confirmLabel="Guardar cambios"
	pendingLabel="Guardando…"
	form="design-form"
	pending={editor.saving}
>
	<ChangeList changes={editor.changes} />
	<p class="text-muted-foreground text-xs">Se publica en tu tienda al guardar.</p>
</ConfirmDialog>

<ConfirmDialog
	bind:open={editor.discardDialogOpen}
	title="¿Descartar {countChanges(editor.changes.length)} sin guardar?"
	confirmLabel="Descartar"
	cancelLabel="Seguir editando"
	variant="destructive"
	onconfirm={() => editor.discard()}
>
	<ChangeList changes={editor.changes} mode="discard" />
</ConfirmDialog>

<ActionToasts />

<!-- Lo escalar se guarda con un solo Guardar: el botón del encabezado envía este form. -->
<form id="design-form" method="POST" action="?/save" use:enhance={editor.save} hidden></form>

<!-- Los bloques de abajo: cada uno tiene su form, referenciado por id desde sus botones. -->
<div hidden>
	{#each data.highlights as highlight (highlight.id)}
		<form id="highlight-{highlight.id}" method="POST" action="?/updateBlock" use:enhance>
			<input type="hidden" name="id" value={highlight.id} />
		</form>

		<form
			id="delete-highlight-{highlight.id}"
			method="POST"
			action="?/deleteBlock"
			use:enhance={onDelete}
		>
			<input type="hidden" name="id" value={highlight.id} />
		</form>
	{/each}

	<form id="remove-logo" method="POST" action="?/removeLogo" use:enhance={onDelete}></form>
</div>

<ConfirmDeleteDialog
	bind:open={deletion.open}
	title={deletion.target?.title ?? ''}
	description={deletion.target?.description}
	form={deletion.target?.formId ?? ''}
	confirmLabel={deletion.target?.confirmLabel}
	pendingLabel={deletion.target?.pendingLabel}
	pending={deletion.pending}
/>
