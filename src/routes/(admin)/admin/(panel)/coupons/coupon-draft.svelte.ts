// Tipos
import type { PreviewStore } from '$lib/utils/storefront-preview.svelte';
import type { DraftCoupon, DraftCouponType } from '$lib/domain/preview';

// Estado
import { FormState } from '$lib/utils/form-state.svelte';
import { StorefrontPreview } from '$lib/utils/storefront-preview.svelte';

/** Un número que se puede pintar: lo vacío o inválido cuenta como cero. */
function amount(value: number | null): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** El cupón que se está creando, visto en el carrito de la tienda mientras se escribe. */
export class CouponDraft extends StorefrontPreview<DraftCoupon> {
	code = $state('');
	type = $state<DraftCouponType>('percent');
	value = $state<number | null>(null);
	minSubtotal = $state<number | null>(0);
	active = $state(true);

	/** Al crear, el borrador vuelve a vacío. */
	readonly createForm = new FormState();
	readonly create = this.createForm.submit({ onSuccess: () => this.reset() });

	constructor(store: () => PreviewStore) {
		super(store, '/preview/cart', 'cart-coupon');
	}

	content(): DraftCoupon {
		return {
			kind: 'coupon',
			code: this.code,
			type: this.type,
			value: amount(this.value),
			minSubtotal: amount(this.minSubtotal),
			active: this.active
		};
	}

	reset() {
		this.code = '';
		this.type = 'percent';
		this.value = null;
		this.minSubtotal = 0;
		this.active = true;
	}
}
