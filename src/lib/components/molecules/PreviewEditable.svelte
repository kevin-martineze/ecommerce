<script lang="ts">
	import { EDITABLE_ZONES, isEditableZone } from '$lib/domain/editable-zones';
	import { PREVIEW_EDIT_MESSAGE } from '$lib/domain/preview';

	/**
	 * Solo dentro del editor de Diseño: la tienda vive en un iframe y las zonas
	 * editables de su vista previa llevan un lápiz y un resaltado al pasar el
	 * mouse. Un clic en una de ellas no navega: avisa al editor qué zona fue.
	 *
	 * Fuera del iframe no hace nada: la tienda pública no cambia.
	 */

	/** La zona editable más interna bajo `target`, o null si no hay ninguna. */
	function zonaEditableDe(target: EventTarget | null): HTMLElement | null {
		if (!(target instanceof Element)) return null;

		// La más interna: si dentro de una zona editable hay otra que no lo es
		// (el menú dentro de la cabecera), no se resalta nada.
		const zona = target.closest<HTMLElement>('[data-preview-zone]');

		return isEditableZone(zona?.dataset.previewZone) ? zona : null;
	}

	$effect(() => {
		if (window.parent === window) return;

		let hovered: HTMLElement | null = null;

		function marcar(next: HTMLElement | null) {
			if (next === hovered) return;

			if (hovered) {
				delete hovered.dataset.editing;
				delete hovered.dataset.editLabel;
			}

			hovered = next;

			const nombre = next?.dataset.previewZone;

			if (next && isEditableZone(nombre)) {
				next.dataset.editing = '';
				next.dataset.editLabel = EDITABLE_ZONES[nombre].etiqueta;
			}
		}

		function onMove(event: PointerEvent) {
			marcar(zonaEditableDe(event.target));
		}

		function onSalir() {
			marcar(null);
		}

		function onClick(event: MouseEvent) {
			const zona = zonaEditableDe(event.target);
			const nombre = zona?.dataset.previewZone;

			if (!isEditableZone(nombre)) return;

			// Capturado en el documento: el link del hero o del logo no llega a navegar.
			event.preventDefault();
			event.stopPropagation();

			// El mensaje solo lleva el nombre de la zona; no hay datos de la tienda.
			window.parent.postMessage({ type: PREVIEW_EDIT_MESSAGE, zone: nombre }, '*');
		}

		document.addEventListener('pointermove', onMove);
		document.documentElement.addEventListener('pointerleave', onSalir);
		document.addEventListener('click', onClick, true);

		return () => {
			document.removeEventListener('pointermove', onMove);
			document.documentElement.removeEventListener('pointerleave', onSalir);
			document.removeEventListener('click', onClick, true);
			marcar(null);
		};
	});
</script>
