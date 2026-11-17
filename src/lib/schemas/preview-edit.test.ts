// Librerías
import { describe, expect, it } from 'vitest';

// Dominio
import { EDITABLE_ZONE_NAMES } from '$lib/domain/editable-zones';
import { PREVIEW_EDIT_MESSAGE } from '$lib/domain/preview';
import { readPreviewEdit } from '$lib/schemas/preview-edit';

describe('readPreviewEdit', () => {
	it('un mensaje válido devuelve la zona', () => {
		expect(readPreviewEdit({ type: PREVIEW_EDIT_MESSAGE, zone: 'hero' })).toBe('hero');
	});

	it('cada zona editable se reconoce', () => {
		for (const zone of EDITABLE_ZONE_NAMES) {
			expect(readPreviewEdit({ type: PREVIEW_EDIT_MESSAGE, zone })).toBe(zone);
		}
	});

	it('una zona que no se edita aquí se rechaza', () => {
		expect(readPreviewEdit({ type: PREVIEW_EDIT_MESSAGE, zone: 'product-card' })).toBeNull();
		expect(readPreviewEdit({ type: PREVIEW_EDIT_MESSAGE, zone: 'store-footer' })).toBeNull();
	});

	it('un mensaje de otro tipo no cuenta', () => {
		expect(readPreviewEdit({ type: 'globerce:borrador', zone: 'hero' })).toBeNull();
	});

	it('payloads basura no rompen nada', () => {
		expect(readPreviewEdit(null)).toBeNull();
		expect(readPreviewEdit(undefined)).toBeNull();
		expect(readPreviewEdit('hero')).toBeNull();
		expect(readPreviewEdit(42)).toBeNull();
		expect(readPreviewEdit({})).toBeNull();
		expect(readPreviewEdit({ type: PREVIEW_EDIT_MESSAGE })).toBeNull();
		expect(readPreviewEdit({ type: PREVIEW_EDIT_MESSAGE, zone: { nested: true } })).toBeNull();
	});
});
