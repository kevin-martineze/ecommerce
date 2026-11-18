<!--
@component
La portada comercial de Globerce: `StackedLayout` con la barra flotando sobre
la portada, el pie fijo y el scroll suave. La página pone las secciones.
-->
<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';

	// Componentes
	import StackedLayout from '$lib/components/layouts/StackedLayout.svelte';
	import MarketingFooter from '$lib/components/organisms/MarketingFooter.svelte';
	import MarketingHeader from '$lib/components/organisms/MarketingHeader.svelte';
	import SmoothScroll from '$lib/components/organisms/SmoothScroll.svelte';

	interface Props {
		/** Con sesión, la barra lleva al panel en vez de a entrar. */
		signedIn: boolean;
		children: Snippet;
	}

	let { signedIn, children }: Props = $props();
</script>

<StackedLayout class="marketing" headerPosition="overlay">
	{#snippet header()}
		<MarketingHeader {signedIn} />
	{/snippet}

	<!-- El scroll suave mueve el contenido y el pie, nunca la barra fija. -->
	{#snippet scroller(body: Snippet)}
		<SmoothScroll>{@render body()}</SmoothScroll>
	{/snippet}

	{@render children()}

	{#snippet footer()}
		<MarketingFooter />
	{/snippet}
</StackedLayout>
