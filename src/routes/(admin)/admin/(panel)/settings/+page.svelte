<script lang="ts">
	// Tipos
	import type { PreviewZone, StorefrontDraft } from '$lib/domain/preview';
	import type { PageData } from './$types';

	// Svelte
	import { untrack } from 'svelte';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import { Input } from '$lib/components/atoms/input';
	import { Label } from '$lib/components/atoms/label';
	import MoneyField from '$lib/components/molecules/MoneyField.svelte';
	import LivePreviewLayout from '$lib/components/organisms/LivePreviewLayout.svelte';

	// Utilidades
	import { themePreviewUrl } from '$lib/template-preview';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Copia editable de los ajustes; no se sincroniza sola.
	let whatsappPhone = $state(untrack(() => data.current.whatsapp_phone));
	let instagramUrl = $state(untrack(() => data.current.instagram_url ?? ''));
	let freeShippingThreshold = $state<number | null>(
		untrack(() => data.current.free_shipping_threshold)
	);

	let saving = $state(false);

	/** La zona de la tienda que se resalta según el campo que se está editando. */
	let focus = $state<PreviewZone>('store-footer');

	// El nombre y el anuncio no se editan aquí: la vista previa los pinta como están.
	const draft = $derived<StorefrontDraft>({
		template: data.current.template,
		theme: data.current.theme,
		content: {
			kind: 'settings',
			storeName: data.current.store_name,
			whatsappPhone,
			instagramUrl,
			announcement: data.current.announcement ?? '',
			freeShippingThreshold
		},
		focus
	});

	const previewSrc = $derived(
		themePreviewUrl(
			new URL('/', data.previewUrl).toString(),
			data.current.template,
			data.current.theme
		)
	);
</script>

<svelte:head>
	<title>Ajustes — Globerce</title>
</svelte:head>

<header class="mb-6">
	<h1 class="text-3xl">Ajustes</h1>
	<p class="text-muted-foreground text-sm">
		Tu WhatsApp, tu Instagram y el envío gratis. Arman el mensaje de WhatsApp y los datos de la
		tienda.
	</p>
	<p class="text-muted-foreground text-sm">
		El logo, el nombre y la barra de anuncio están en
		<a href="/admin/design?section=marca" class="text-foreground underline underline-offset-4">
			Diseño › Marca
		</a>.
	</p>
</header>

<LivePreviewLayout src={previewSrc} {draft} title="Así se ven tus ajustes">
	<div class="border-border bg-card rounded-lg border p-6">
		<form
			method="POST"
			action="?/save"
			class="space-y-5"
			use:enhance={() => {
				saving = true;

				return async ({ update }) => {
					await update({ reset: false });
					saving = false;
				};
			}}
		>
			<div class="space-y-2">
				<Label for="whatsappPhone">WhatsApp</Label>
				<Input
					id="whatsappPhone"
					name="whatsappPhone"
					bind:value={whatsappPhone}
					required
					placeholder="573001234567"
					onfocusin={() => (focus = 'store-footer')}
				/>
				<p class="text-muted-foreground text-xs">
					Con indicativo de país y sin símbolos. Colombia es 57.
				</p>
			</div>

			<div class="space-y-2">
				<Label for="instagramUrl">Instagram</Label>
				<Input
					id="instagramUrl"
					name="instagramUrl"
					type="url"
					bind:value={instagramUrl}
					placeholder="https://instagram.com/tu-tienda"
					onfocusin={() => (focus = 'store-footer')}
				/>
			</div>

			<div class="space-y-2">
				<Label for="freeShippingThreshold">Envío gratis desde</Label>
				<MoneyField
					id="freeShippingThreshold"
					name="freeShippingThreshold"
					bind:value={freeShippingThreshold}
					onfocusin={() => (focus = 'store-footer')}
					placeholder="Sin envío gratis"
				/>
			</div>

			<Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar ajustes'}</Button>
		</form>
	</div>
</LivePreviewLayout>
