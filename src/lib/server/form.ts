// Tipos
import type { ActionFailure } from '@sveltejs/kit';
import type { z } from 'zod';

// Svelte
import { fail } from '@sveltejs/kit';

// Utilidades
import { type FieldErrors, fieldErrors } from '$lib/utils/form';

/** Lo que devuelve una action cuando el formulario no pasa la validación. */
export type FormFailure = ActionFailure<{ error: string; fields: FieldErrors }>;

export type ParsedForm<T> =
	{ ok: true; data: T; formData: FormData } | { ok: false; failure: FormFailure };

/**
 * El `FormData` como objeto plano: un campo repetido llega como lista, uno
 * solo como su valor. Los checkbox sin marcar no llegan; el esquema decide qué
 * significa su ausencia (ver `checkbox` en `$lib/schemas/fields`).
 */
export function formValues(
	formData: FormData
): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
	const values: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};

	for (const key of new Set(formData.keys())) {
		const all = formData.getAll(key);

		values[key] = all.length > 1 ? all : (all[0] ?? '');
	}

	return values;
}

/**
 * Lee y valida el formulario de una action con su esquema.
 *
 * ```ts
 * const form = await parseForm(event, couponSchema);
 * if (!form.ok) return form.failure;
 * ```
 *
 * El primer error va en `error` (el toast) y todos, uno por campo, en `fields`
 * (para `FormField`).
 */
export async function parseForm<S extends z.ZodTypeAny>(
	event: { request: Request },
	schema: S
): Promise<ParsedForm<z.output<S>>> {
	const formData = await event.request.formData();
	const parsed = schema.safeParse(formValues(formData));

	if (parsed.success) return { ok: true, data: parsed.data, formData };

	return {
		ok: false,
		failure: fail(400, {
			error: parsed.error.issues.at(0)?.message ?? 'Revisa los datos.',
			fields: fieldErrors(parsed.error)
		})
	};
}
