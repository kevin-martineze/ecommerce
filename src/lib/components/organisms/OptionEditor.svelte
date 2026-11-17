<script lang="ts">
	// Tipos
	import type { ProductOption } from '$lib/server/api/panel-catalog';

	// Svelte
	import { untrack } from 'svelte';

	// Iconos
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import * as Card from '$lib/components/atoms/card';
	import { Input } from '$lib/components/atoms/input';
	import { Label } from '$lib/components/atoms/label';
	import ColorField from '$lib/components/molecules/ColorField.svelte';

	// Dominio
	import { INDUSTRIES } from '$lib/domain/industries';

	/**
	 * Los ejes por los que se divide un producto.
	 *
	 * Cada producto declara los suyos: una camisa se divide por variación y color,
	 * un café por molienda y peso, un libro por nada. Antes eran dos listas de
	 * la tienda —colores y variaciones— y eso obligaba a toda tienda a vender ropa.
	 *
	 * La lista viaja como JSON en un campo oculto y no como campos sueltos:
	 * son arreglos anidados de largo variable, y `FormData` los aplanaría a
	 * `values[0][hex]`, que hay que volver a armar del otro lado. Esta pantalla
	 * ya necesita JavaScript para añadir y quitar filas, así que no se pierde
	 * nada que no estuviera perdido.
	 */
	interface Props {
		options: ProductOption[];
		/** Sin ejes que ya estén en uso no se puede quitar nada: lo dirá el servidor. */
		submitting?: boolean;
	}

	let { options, submitting = false }: Props = $props();

	interface EditableValue {
		value: string;
		hex: string;
	}

	interface EditableAxis {
		name: string;
		values: EditableValue[];
	}

	/**
	 * Copia local: mutar el prop sería editar lo que el servidor dijo que hay.
	 *
	 * `untrack` porque es una semilla, no una suscripción: cuando el servidor
	 * responde, la página se recarga y el componente se monta de nuevo con los
	 * ejes ya guardados. Sin él, lo tecleado se perdería en cada respuesta.
	 */
	let axes = $state<EditableAxis[]>(
		untrack(() =>
			options.map((option) => ({
				name: option.name,
				values: option.values.map((optionValue) => ({
					value: optionValue.value,
					hex: optionValue.hex ?? ''
				}))
			}))
		)
	);

	const MAX_AXES = 3;

	/** Lo que viaja: sin valores vacíos y sin hex cuando no es un color. */
	const payload = $derived(
		JSON.stringify(
			axes
				.filter((axis) => axis.name.trim().length > 0)
				.map((axis) => ({
					name: axis.name.trim(),
					values: axis.values
						.filter((optionValue) => optionValue.value.trim().length > 0)
						.map((optionValue) => ({
							value: optionValue.value.trim(),
							...(optionValue.hex ? { hex: optionValue.hex } : {})
						}))
				}))
				.filter((axis) => axis.values.length > 0)
		)
	);

	/** Cuántas combinaciones saldrían. Sirve para avisar antes de crear ciento veinte. */
	const combinations = $derived(
		axes.reduce(
			(total, axis) =>
				total *
				Math.max(
					1,
					axis.values.filter((optionValue) => optionValue.value.trim().length > 0).length
				),
			1
		)
	);

	/**
	 * Arranca con los ejes típicos de un rubro.
	 *
	 * Solo se ofrece cuando no hay ninguno: un atajo que pisara lo ya escrito
	 * sería una trampa, no una ayuda.
	 */
	function applyIndustry(id: string) {
		const industry = INDUSTRIES.find((candidate) => candidate.id === id);

		if (!industry) return;

		axes = industry.options.map((option) => ({
			name: option.name,
			values: option.values.map((optionValue) => ({
				value: optionValue.value,
				hex: optionValue.hex ?? ''
			}))
		}));
	}

	function addAxis() {
		axes = [...axes, { name: '', values: [{ value: '', hex: '' }] }];
	}

	function removeAxis(index: number) {
		axes = axes.filter((_, actual) => actual !== index);
	}

	function addValue(index: number) {
		axes = axes.map((axis, actual) =>
			actual === index ? { ...axis, values: [...axis.values, { value: '', hex: '' }] } : axis
		);
	}

	function removeValue(axisIndex: number, valueIndex: number) {
		axes = axes.map((axis, actual) =>
			actual === axisIndex
				? { ...axis, values: axis.values.filter((_, i) => i !== valueIndex) }
				: axis
		);
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Cómo se divide</Card.Title>
		<Card.Description>
			Variación, color, molienda, formato… lo que aplique a este producto. Si no se divide en nada
			—un libro, una vela— déjalo vacío: tendrá una sola existencia.
		</Card.Description>
	</Card.Header>

	<Card.Content>
		<form method="POST" action="?/axes" class="space-y-6" use:enhance>
			<input type="hidden" name="options" value={payload} />

			{#if axes.length === 0}
				<div class="space-y-2">
					<p class="text-muted-foreground text-xs">¿Qué vendes? Te dejo los ejes típicos.</p>

					<div class="flex flex-wrap gap-2">
						{#each INDUSTRIES as industry (industry.id)}
							<Button
								type="button"
								variant="outline"
								size="sm"
								title={industry.hint}
								onclick={() => applyIndustry(industry.id)}
							>
								{industry.label}
							</Button>
						{/each}
					</div>
				</div>
			{/if}

			{#each axes as axis, axisIndex (axisIndex)}
				<div class="border-border space-y-3 rounded-lg border p-4">
					<div class="flex items-end gap-3">
						<div class="flex-1 space-y-1.5">
							<Label class="text-xs" for="eje-{axisIndex}">Nombre del eje</Label>
							<Input id="eje-{axisIndex}" bind:value={axis.name} placeholder="Variación" />
						</div>

						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label="Quitar este eje"
							onclick={() => removeAxis(axisIndex)}
						>
							<Trash2 class="size-4" />
						</Button>
					</div>

					<div class="space-y-2">
						<p class="text-muted-foreground text-xs">Valores</p>

						{#each axis.values as optionValue, valueIndex (valueIndex)}
							<div class="flex items-end gap-2">
								<Input bind:value={optionValue.value} placeholder="M" class="flex-1" />

								<!-- El tono es opcional: solo tiene sentido en un eje de color, y
								     la vitrina lo usa para pintar la muestra en la tarjeta. -->
								<ColorField
									id="eje-{axisIndex}-valor-{valueIndex}-hex"
									bind:value={optionValue.hex}
									optional
								/>

								<Button
									type="button"
									variant="ghost"
									size="icon"
									aria-label="Quitar este valor"
									onclick={() => removeValue(axisIndex, valueIndex)}
								>
									<Trash2 class="size-4" />
								</Button>
							</div>
						{/each}

						<Button type="button" variant="outline" size="sm" onclick={() => addValue(axisIndex)}>
							<Plus class="size-4" />
							Añadir valor
						</Button>
					</div>
				</div>
			{/each}

			<div class="flex flex-wrap items-center gap-3">
				{#if axes.length < MAX_AXES}
					<Button type="button" variant="outline" onclick={addAxis}>
						<Plus class="size-4" />
						Añadir eje
					</Button>
				{/if}

				<Button type="submit" disabled={submitting}>
					{submitting ? 'Guardando…' : 'Guardar ejes'}
				</Button>

				{#if axes.length > 0}
					<p class="text-muted-foreground text-xs">
						{combinations}
						{combinations === 1 ? 'combinación posible' : 'combinaciones posibles'}
					</p>
				{/if}
			</div>

			<p class="text-muted-foreground text-xs">
				Quitar un valor que ya tenga existencias no se puede: primero borra esas combinaciones.
			</p>
		</form>
	</Card.Content>
</Card.Root>
