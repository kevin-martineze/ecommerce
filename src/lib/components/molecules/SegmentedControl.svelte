<!--
@component
Un grupo de botones donde solo uno está elegido: la página que se ve, la
pantalla de la vista previa. Con `icon`, el botón muestra solo el ícono y la
etiqueta queda para lectores de pantalla.
-->
<script lang="ts" generics="T extends string">
	// Tipos
	import type { Component } from 'svelte';

	// Utilidades
	import { cn } from '$lib/utils';

	interface Option {
		value: T;
		label: string;
		icon?: Component;
	}

	interface Props {
		options: Option[];
		value: T;
		/** Qué se elige, para lectores de pantalla: «Pantalla», «Página que ves». */
		label: string;
	}

	let { options, value = $bindable(), label }: Props = $props();
</script>

<div class="bg-muted flex rounded-md p-0.5" role="group" aria-label={label}>
	{#each options as option (option.value)}
		<button
			type="button"
			class={cn(
				'rounded transition-colors',
				option.icon ? 'p-1.5' : 'px-2.5 py-1 text-xs',
				value === option.value
					? 'bg-background text-foreground shadow-xs'
					: 'text-muted-foreground hover:text-foreground'
			)}
			aria-pressed={value === option.value}
			aria-label={option.icon ? option.label : undefined}
			title={option.icon ? option.label : undefined}
			onclick={() => (value = option.value)}
		>
			{#if option.icon}
				<option.icon class="size-4" />
			{:else}
				{option.label}
			{/if}
		</button>
	{/each}
</div>
