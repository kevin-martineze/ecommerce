// Librerías
import { z } from 'zod';

/**
 * Piezas para leer campos de formulario con zod. Lo que llega de un
 * `FormData` siempre es texto (o un archivo); estas piezas lo convierten.
 */

/** Un checkbox: marcado llega como `on` (o `true` desde un input oculto); sin marcar no llega. */
export const checkbox = z.preprocess(
	(value) => value === 'on' || value === 'true' || value === true,
	z.boolean()
);

/** Un identificador que manda el formulario (oculto): obligatorio y no vacío. */
export const formId = z
	.string({ required_error: 'Falta el identificador.' })
	.trim()
	.min(1, 'Falta el identificador.');

/** Texto opcional: vacío o ausente es `null`. */
export const optionalText = z.preprocess(
	(value) => (typeof value === 'string' && value.trim() === '' ? null : value),
	z.string().trim().nullable().default(null)
);

/** Un entero opcional: vacío o ausente es `null`. */
export const optionalInt = z.preprocess(
	(value) =>
		value === undefined || (typeof value === 'string' && value.trim() === '') ? null : value,
	z.coerce
		.number({ invalid_type_error: 'Escribe un número.' })
		.int('Escribe un número entero.')
		.nullable()
);
