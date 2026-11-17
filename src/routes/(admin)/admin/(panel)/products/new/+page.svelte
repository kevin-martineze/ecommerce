<script lang="ts">
	// Tipos
	import type { StorefrontDraft } from '$lib/domain/preview';
	import type { ProductFormValues } from '$lib/domain/product-form';
	import type { ActionData, PageData } from './$types';

	// Componentes
	import ProductForm from '$lib/components/organisms/ProductForm.svelte';
	import PreviewTemplate from '$lib/components/templates/PreviewTemplate.svelte';

	// Utilidades
	import { themePreviewUrl } from '$lib/template-preview';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	let live = $state<ProductFormValues>({
		name: '',
		slug: '',
		description: '',
		categoryId: '',
		basePrice: null,
		compareAtPrice: null,
		status: 'draft',
		featured: false
	});

	const draft = $derived<StorefrontDraft>({
		template: data.settings.template,
		theme: data.settings.theme,
		content: {
			kind: 'product',
			name: live.name,
			slug: live.slug,
			description: live.description,
			categoryId: live.categoryId || null,
			basePrice: typeof live.basePrice === 'number' ? live.basePrice : 0,
			compareAtPrice: typeof live.compareAtPrice === 'number' ? live.compareAtPrice : null,
			status: live.status,
			featured: live.featured,
			image: null
		},
		focus: 'product-card'
	});

	const previewSrc = $derived(
		themePreviewUrl(
			new URL('/preview/product', data.previewUrl).toString(),
			data.settings.template,
			data.settings.theme
		)
	);
</script>

<svelte:head>
	<title>Nuevo producto — Globerce</title>
</svelte:head>

<PreviewTemplate
	title="Nuevo producto"
	description="Al guardar podrás subir fotos y crear las variaciones con su inventario."
	back={{ href: '/admin/products', label: 'Productos' }}
	src={previewSrc}
	{draft}
	previewTitle="Así se ve tu producto"
>
	<div class="border-border bg-card rounded-lg border p-6">
		<ProductForm
			categories={data.categories}
			error={form?.error ?? null}
			submitLabel="Crear producto"
			values={live}
			onvalues={(values) => (live = { ...values })}
		/>
	</div>
</PreviewTemplate>
