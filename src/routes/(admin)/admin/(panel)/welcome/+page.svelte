<script lang="ts">
	// Tipos
	import type { PageData } from './$types';

	// Componentes
	import TemplatePicker from '$lib/components/organisms/TemplatePicker.svelte';
	import PageTemplate from '$lib/components/templates/PageTemplate.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<svelte:head>
	<title>Elige tu plantilla — Globerce</title>
</svelte:head>

<PageTemplate
	title="¿Cómo quieres que se vea tu tienda?"
	eyebrow="Primer paso"
	description="Elige con qué plantilla arrancas. Cambia los colores, la tipografía y cómo se arma la portada — nunca tus productos ni tus pedidos—, así que puedes cambiarla cuando quieras desde Portada."
>
	<TemplatePicker
		current={data.settings.template}
		storeUrl={data.previewUrl}
		action="?/template&store={data.storeSlug}"
		cta="Empezar con esta"
	/>

	<p class="text-muted-foreground mt-6 text-sm">
		<a href="/admin?welcome={data.storeSlug}" class="hover:text-foreground underline">
			Lo decido después
		</a>
		· Tu tienda ya está en
		<a
			href={data.storeUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="hover:text-foreground underline"
		>
			{data.storeUrl.replace(/^https?:\/\//, '')}
		</a>
	</p>
</PageTemplate>
