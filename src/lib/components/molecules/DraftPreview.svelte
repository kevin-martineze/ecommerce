<script lang="ts">
	// Tipos
	import type { EditableZoneName } from '$lib/domain/editable-zones';
	import type { StorefrontDraft } from '$lib/storefront-draft';

	// Dominio
	import { readPreviewEdit } from '$lib/schemas/preview-edit';

	// Utilidades
	import { draftMessage, isReadyMessage } from '$lib/storefront-draft';
	import { cn } from '$lib/utils';

	/**
	 * La tienda de verdad, a tamaño real, vestida con el borrador del editor.
	 *
	 * Carga una sola vez —`src` solo cambia al cambiar de página o de
	 * dispositivo— y cada ajuste le llega por `postMessage`, así responde al
	 * instante. Se puede recorrer: el borrador sigue puesto al navegar dentro,
	 * porque la tienda lo guarda en memoria (ver `storefront-draft.svelte.ts`).
	 *
	 * Si la tienda se recarga, vuelve a avisar que está lista y se le manda el
	 * borrador otra vez.
	 */
	interface Props {
		src: string;
		draft: StorefrontDraft;
		device: 'desktop' | 'mobile';
		title: string;
		/** Qué zona de la vista previa pidió editar la dueña con un clic. */
		onedit?: (zone: EditableZoneName) => void;
	}

	let { src, draft, device, title, onedit }: Props = $props();

	let frame = $state<HTMLIFrameElement>();

	const targetOrigin = $derived(new URL(src).origin);

	/**
	 * La ventana de la tienda que ya avisó que escucha. Hasta entonces el
	 * `iframe` puede estar todavía en blanco —con el origen del panel— y
	 * mandarle algo solo deja un error en la consola.
	 */
	let listening: Window | null = null;

	function send() {
		// El borrador se lee siempre, aunque no se mande: así este efecto queda
		// suscrito a sus cambios desde el primer momento. Se manda una copia sin
		// proxies de Svelte para que `postMessage` pueda clonarla; los `Blob` de
		// las fotos viajan tal cual por structured clone.
		const message = draftMessage($state.snapshot(draft));
		const target = frame?.contentWindow;

		if (target && target === listening) target.postMessage(message, targetOrigin);
	}

	// La tienda avisa cuando ya escucha: se le contesta con el borrador.
	$effect(() => {
		function onMessage(event: MessageEvent) {
			if (event.source !== frame?.contentWindow || event.origin !== targetOrigin) return;

			if (isReadyMessage(event.data)) {
				listening = frame?.contentWindow ?? null;
				send();
				return;
			}

			// Un clic en una zona editable de la tienda: el editor decide a dónde llevarlo.
			const zone = readPreviewEdit(event.data);

			if (zone) onedit?.(zone);
		}

		window.addEventListener('message', onMessage);

		return () => window.removeEventListener('message', onMessage);
	});

	// Cada cambio del borrador se manda en cuanto ocurre.
	$effect(send);
</script>

<div
	class={cn(
		'bg-background mx-auto h-full overflow-hidden shadow-sm transition-[width] duration-300',
		device === 'mobile'
			? 'border-border w-full max-w-sm rounded-4xl border-8'
			: 'border-border w-full rounded-lg border'
	)}
>
	<iframe bind:this={frame} {src} {title} class="size-full border-0"></iframe>
</div>
