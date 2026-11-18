// Librerías
import { z } from 'zod';

// Dominio
import { EDITABLE_ZONE_NAMES, type EditableZoneName } from '$lib/domain/editable-zones';
import { PREVIEW_EDIT_MESSAGE } from '$lib/domain/preview';

/** El mensaje que la tienda manda al editor al hacer clic en una zona editable. */
const previewEditSchema = z.object({
	type: z.literal(PREVIEW_EDIT_MESSAGE),
	zone: z.enum(EDITABLE_ZONE_NAMES)
});

/** La zona que la tienda pidió editar, o null si el mensaje no es ese o trae una zona desconocida. */
export function readPreviewEdit(data: unknown): EditableZoneName | null {
	const parsed = previewEditSchema.safeParse(data);

	return parsed.success ? parsed.data.zone : null;
}
