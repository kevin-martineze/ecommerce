// Tipos
import type { PreviewStore } from '$lib/utils/storefront-preview.svelte';
import type { DraftShipping, DraftShippingZone } from '$lib/domain/preview';
import type { ShippingZone } from '$lib/domain/settings';

// Estado
import { FormState } from '$lib/utils/form-state.svelte';
import { StorefrontPreview } from '$lib/utils/storefront-preview.svelte';

/** Lo que la dueña cambió de una zona guardada y aún no ha enviado. */
export interface ZoneEdit {
	name?: string;
	/** Un campo vacío llega como null: se guarda así y la vista previa lo pinta en cero. */
	cost?: number | null;
	etaDays?: number;
	active?: boolean;
}

export interface ZoneRow {
	id: string;
	name: string;
	cost: number | null;
	etaDays: number | null;
	active: boolean;
	sortOrder: number;
}

export interface ShippingData extends PreviewStore {
	zones: ShippingZone[];
}

/**
 * Las zonas de envío: cada fila guardada con lo que se escribe encima, más la
 * zona nueva. Todo se ve en el carrito de la tienda antes de guardarlo.
 */
export class ShippingEditor extends StorefrontPreview<DraftShipping> {
	/** Los cambios de cada fila, por id: la lista sigue pintando lo guardado debajo. */
	edits = $state<Record<string, ZoneEdit>>({});

	newName = $state('');
	newCost = $state<number | null>(0);
	newEtaDays = $state(2);
	newActive = $state(true);

	readonly createForm = new FormState();
	readonly create = this.createForm.submit({ onSuccess: () => this.resetNew() });

	/** Las zonas guardadas, con las ediciones encima. */
	readonly rows: ZoneRow[];

	constructor(data: () => ShippingData) {
		super(data, '/preview/cart', 'shipping-info');

		this.rows = $derived(
			data().zones.map((zone) => {
				const edit = this.edits[zone.id];

				return {
					id: zone.id,
					name: edit?.name ?? zone.name,
					// `cost` puede quedar en null a propósito: no se usa `??` con lo guardado.
					cost: edit?.cost === undefined ? zone.cost : edit.cost,
					etaDays: edit?.etaDays ?? zone.eta_days,
					active: edit?.active ?? zone.active,
					sortOrder: zone.sort_order
				};
			})
		);
	}

	content(): DraftShipping {
		const zones: DraftShippingZone[] = this.rows.map((zone) => ({
			id: zone.id,
			name: zone.name,
			cost: zone.cost ?? 0,
			etaDays: zone.etaDays,
			active: zone.active
		}));

		if (this.newName.trim()) {
			zones.push({
				id: 'new',
				name: this.newName,
				cost: this.newCost ?? 0,
				etaDays: Number.isFinite(this.newEtaDays) ? this.newEtaDays : null,
				active: this.newActive
			});
		}

		return { kind: 'shipping', zones };
	}

	edit(id: string, patch: ZoneEdit) {
		this.edits[id] = { ...this.edits[id], ...patch };
	}

	/** Después de guardar una fila, lo guardado ya trae sus cambios. */
	forget(id: string) {
		delete this.edits[id];
	}

	resetNew() {
		this.newName = '';
		this.newCost = 0;
		this.newEtaDays = 2;
		this.newActive = true;
	}
}
