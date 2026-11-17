<script lang="ts">
	// Dominio
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
	function editableZoneFor(target: EventTarget | null): HTMLElement | null {
		if (!(target instanceof Element)) return null;

		// La más interna: si dentro de una zona editable hay otra que no lo es
		// (el menú dentro de la cabecera), no se resalta nada.
		const zoneElement = target.closest<HTMLElement>('[data-preview-zone]');

		return isEditableZone(zoneElement?.dataset.previewZone) ? zoneElement : null;
	}

	$effect(() => {
		if (window.parent === window) return;

		let hovered: HTMLElement | null = null;

		function mark(next: HTMLElement | null) {
			if (next === hovered) return;

			if (hovered) {
				delete hovered.dataset.editing;
				delete hovered.dataset.editLabel;
			}

			hovered = next;

			const name = next?.dataset.previewZone;

			if (next && isEditableZone(name)) {
				next.dataset.editing = '';
				next.dataset.editLabel = EDITABLE_ZONES[name].tagLabel;
			}
		}

		function onMove(event: PointerEvent) {
			mark(editableZoneFor(event.target));
		}

		function onExit() {
			mark(null);
		}

		function onClick(event: MouseEvent) {
			const zoneElement = editableZoneFor(event.target);
			const name = zoneElement?.dataset.previewZone;

			if (!isEditableZone(name)) return;

			// Capturado en el documento: el link del hero o del logo no llega a navegar.
			event.preventDefault();
			event.stopPropagation();

			// El mensaje solo lleva el nombre de la zona; no hay datos de la tienda.
			window.parent.postMessage({ type: PREVIEW_EDIT_MESSAGE, zone: name }, '*');
		}

		document.addEventListener('pointermove', onMove);
		document.documentElement.addEventListener('pointerleave', onExit);
		document.addEventListener('click', onClick, true);

		return () => {
			document.removeEventListener('pointermove', onMove);
			document.documentElement.removeEventListener('pointerleave', onExit);
			document.removeEventListener('click', onClick, true);
			mark(null);
		};
	});
</script>
