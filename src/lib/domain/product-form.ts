import type { ProductStatus } from '$lib/domain/catalog';

/**
 * Los campos editables de la ficha de un producto, tal como viven en el
 * formulario del panel.
 *
 * `basePrice` y `compareAtPrice` son `null` mientras el campo está vacío. El
 * resto es lo que la ficha necesita para pintarse igual que la tienda.
 */
export interface ProductFormValues {
	name: string;
	slug: string;
	description: string;
	categoryId: string;
	basePrice: number | null;
	compareAtPrice: number | null;
	status: ProductStatus;
	featured: boolean;
}
