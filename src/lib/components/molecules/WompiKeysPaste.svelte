<script lang="ts">
	// Iconos
	import Check from '@lucide/svelte/icons/check';
	import AlertTriangle from '@lucide/svelte/icons/triangle-alert';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import { Label } from '$lib/components/atoms/label';
	import { Textarea } from '$lib/components/atoms/textarea';

	// Dominio
	import { completeWompiKeys, mixedModes, parseWompiKeys, wompiMode } from '$lib/domain/wompi';

	// Utilidades
	import { cn } from '$lib/utils';

	/**
	 * Un solo cuadro para las cuatro llaves de Wompi.
	 *
	 * Las cuatro tienen prefijos distintos (`pub_`, `prv_`, `…_integrity_`,
	 * `…_events_`), así que el cuadro las reconoce de lo que se pegue, en
	 * cualquier orden y con o sin las etiquetas del panel de Wompi. Lo que viaja
	 * al servidor es el texto tal cual (`pasteText`): él hace el mismo
	 * reconocimiento, así que funciona sin JavaScript.
	 *
	 * El botón vive aquí para que solo se active cuando las cuatro estén
	 * reconocidas: el padre no tiene que saber nada de las llaves.
	 */
	interface Props {
		error?: string | null;
		submitting?: boolean;
		submitLabel?: string;
	}

	let { error = null, submitting = false, submitLabel = 'Conectar' }: Props = $props();

	let text = $state('');
	const keys = $derived(parseWompiKeys(text));
	const complete = $derived(completeWompiKeys(keys) !== null);
	const mixedList = $derived(mixedModes(keys));
	const mode = $derived(keys.publicKey ? wompiMode(keys.publicKey) : null);

	const fields = [
		{ field: 'publicKey' as const, label: 'Llave pública' },
		{ field: 'privateKey' as const, label: 'Llave privada' },
		{ field: 'integritySecret' as const, label: 'Secreto de integridad' },
		{ field: 'eventsSecret' as const, label: 'Secreto de eventos' }
	];

	/** El prefijo y unos caracteres, nunca la llave entera. */
	function hint(keyName: string): string {
		return `${keyName.slice(0, keyName.indexOf('_', keyName.indexOf('_') + 1) + 5)}…`;
	}
</script>

<div class="space-y-4">
	<div class="space-y-2">
		<div class="flex items-center justify-between gap-3">
			<Label for="wompi-paste">Pega aquí las cuatro llaves</Label>
			{#if mode}
				<span class="text-muted-foreground text-xs">
					Modo: <span class="text-foreground font-medium"
						>{mode === 'test' ? 'Pruebas' : 'Producción'}</span
					>
				</span>
			{/if}
		</div>

		<Textarea
			id="wompi-paste"
			bind:value={text}
			rows={4}
			placeholder="Pega aquí lo que copiaste de Wompi: las cuatro llaves, en el orden que sea."
			aria-describedby="wompi-paste-hint"
			aria-invalid={error ? 'true' : undefined}
		/>
	</div>

	{#if error}
		<p class="text-destructive text-sm">{error}</p>
	{/if}

	<ul id="wompi-paste-hint" class="grid gap-2 sm:grid-cols-2">
		{#each fields as pastedField (pastedField.field)}
			{@const found = keys[pastedField.field]}
			<li
				class={cn(
					'flex items-center gap-2 border px-3 py-2 text-sm',
					found
						? 'border-primary text-foreground border-solid'
						: 'border-border text-muted-foreground border-dashed'
				)}
			>
				{#if found}
					<Check class="text-primary size-4 flex-none" />
				{/if}
				<span class="flex-1">{pastedField.label}</span>
				{#if found}
					<span class="text-muted-foreground font-mono text-xs">{hint(found)}</span>
				{/if}
			</li>
		{/each}
	</ul>

	{#if mixedList}
		<p class="text-caution flex items-start gap-2 text-sm">
			<AlertTriangle class="mt-0.5 size-4 flex-none" />
			Estás mezclando llaves de pruebas con llaves de producción. Revisa que las cuatro vengan del mismo
			modo en tu panel de Wompi.
		</p>
	{/if}

	<!--
		Lo único que viaja de aquí es el texto. No se manda cada llave en su
		propio campo: el servidor reconoce las cuatro de `pasteText`.
	-->
	<input type="hidden" name="pasteText" value={text} />

	<Button type="submit" disabled={!complete || submitting}>
		{submitting ? 'Guardando…' : submitLabel}
	</Button>
</div>
