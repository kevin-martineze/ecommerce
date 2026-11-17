<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	import * as InputGroup from '$lib/components/atoms/input-group';
	import { formatAmount, typeAmount } from '$lib/utils/money';

	/**
	 * Campo de precio en pesos: se ve "$ 89.900" mientras se escribe.
	 *
	 * Úsalo en todo input de dinero del panel, en lugar de `type="number"`.
	 *
	 * Envía el texto con los puntos tal cual ("89.900") y el servidor lo lee
	 * con `parseAmount` (el esquema `price` de `$lib/schemas/admin`). Así el
	 * formulario funciona sin JavaScript y no hace falta un input oculto.
	 */
	interface Props {
		name: string;
		id?: string;
		/** Pesos enteros; `null` es campo vacío. */
		value?: number | null;
		/** Id del formulario al que pertenece, cuando el campo vive fuera de él. */
		form?: string;
		placeholder?: string;
		required?: boolean;
		invalid?: boolean;
		class?: string;
		/** Avisa el valor mientras se escribe, para la vista previa. */
		onchange?: (value: number | null) => void;
		onfocusin?: HTMLInputAttributes['onfocusin'];
		'aria-label'?: string;
	}

	let {
		name,
		id,
		value = $bindable(null),
		form,
		placeholder,
		required = false,
		invalid = false,
		class: className,
		onchange,
		onfocusin,
		'aria-label': ariaLabel
	}: Props = $props();

	const text = $derived(typeof value === 'number' ? formatAmount(value) : '');

	function reformat(event: Event & { currentTarget: HTMLInputElement }) {
		const input = event.currentTarget;
		const typed = typeAmount(input.value, input.selectionStart ?? input.value.length);

		// Se escribe en el DOM antes de avisar: así Svelte encuentra el mismo
		// texto y no mueve el cursor al final.
		input.value = typed.text;
		input.setSelectionRange(typed.caret, typed.caret);

		value = typed.value;
		onchange?.(typed.value);
	}
</script>

<InputGroup.Root class={className}>
	<InputGroup.Addon>$</InputGroup.Addon>
	<InputGroup.Input
		{id}
		{name}
		{form}
		{placeholder}
		{required}
		{onfocusin}
		value={text}
		oninput={reformat}
		inputmode="numeric"
		autocomplete="off"
		aria-label={ariaLabel}
		aria-invalid={invalid ? 'true' : undefined}
		class="tabular-nums"
	/>
</InputGroup.Root>
