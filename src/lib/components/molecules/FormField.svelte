<script lang="ts">
	// Tipos
	import type { Snippet } from 'svelte';

	// App
	import { page } from '$app/state';

	// Componentes
	import { Label } from '$lib/components/atoms/label';

	// Dominio
	import { actionFieldError } from '$lib/domain/action-feedback';

	// Utilidades
	import { cn } from '$lib/utils';

	/** Lo que el control recibe para quedar enlazado con su etiqueta, su ayuda y su error. */
	export interface FieldControl {
		id: string;
		name: string;
		'aria-describedby': string | undefined;
		'aria-invalid': boolean | undefined;
	}

	/**
	 * Un campo de formulario: etiqueta, control, ayuda y error.
	 *
	 * El control lo pone quien lo usa (Input, MoneyField, SelectField…) y recibe
	 * los atributos que lo enlazan. Si no se pasa `error`, se lee el de la última
	 * action (`fields[name]` de `parseForm`), así el error del servidor aparece
	 * junto al campo sin escribir nada más.
	 */
	interface Props {
		name: string;
		label: string;
		/** Por omisión, el `name`. */
		id?: string;
		hint?: string;
		error?: string | null;
		class?: string;
		children: Snippet<[FieldControl]>;
	}

	let { name, label, id, hint, error, class: className, children }: Props = $props();

	const controlId = $derived(id ?? name);
	const message = $derived(error === undefined ? actionFieldError(page.form, name) : error);
	const describedBy = $derived(
		message ? `${controlId}-error` : hint ? `${controlId}-hint` : undefined
	);
</script>

<div class={cn('space-y-2', className)}>
	<Label for={controlId}>{label}</Label>
	{@render children({
		id: controlId,
		name,
		'aria-describedby': describedBy,
		'aria-invalid': message ? true : undefined
	})}
	{#if message}
		<p id="{controlId}-error" class="text-destructive text-xs">{message}</p>
	{:else if hint}
		<p id="{controlId}-hint" class="text-muted-foreground text-xs">{hint}</p>
	{/if}
</div>
