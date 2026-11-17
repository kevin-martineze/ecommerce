// Librerías
import { describe, expect, it } from 'vitest';

// Dominio
import {
	parsePlatformSupportFilters,
	supportReplySchema,
	supportTicketSchema
} from '$lib/schemas/support';

const VALID_CASE = {
	subject: 'No me llega el correo de pago',
	category: 'PAYMENTS',
	body: 'Hice un pago de prueba y la cuenta no se refleja.'
};

describe('supportTicketSchema', () => {
	it('acepta un caso completo y recorta los espacios', () => {
		const ok = supportTicketSchema.safeParse({ ...VALID_CASE, subject: '  Pagos raros  ' });

		expect(ok.success).toBe(true);
		expect(ok.success && ok.data.subject).toBe('Pagos raros');
	});

	it('pide un asunto de al menos tres letras', () => {
		const parsed = supportTicketSchema.safeParse({ ...VALID_CASE, subject: 'ab' });

		expect(parsed.success).toBe(false);
		expect(!parsed.success && parsed.error.issues[0]?.message).toBe(
			'El asunto tiene que tener al menos 3 letras.'
		);
	});

	it('rechaza una categoría que no está en la lista', () => {
		expect(supportTicketSchema.safeParse({ ...VALID_CASE, category: 'OTRO' }).success).toBe(false);
	});

	it('pide una descripción de al menos diez letras', () => {
		expect(supportTicketSchema.safeParse({ ...VALID_CASE, body: 'no sirve' }).success).toBe(false);
	});
});

describe('supportReplySchema', () => {
	it('no acepta una respuesta vacía ni de solo espacios', () => {
		expect(supportReplySchema.safeParse({ body: '   ' }).success).toBe(false);
		expect(supportReplySchema.safeParse({ body: 'Gracias' }).success).toBe(true);
	});
});

describe('parsePlatformSupportFilters', () => {
	it('lee estado, búsqueda y página de la URL', () => {
		const activeFilters = parsePlatformSupportFilters(
			new URLSearchParams('status=OPEN&q=pagos&page=3')
		);

		expect(activeFilters).toEqual({ status: 'OPEN', q: 'pagos', page: 3 });
	});

	it('ignora lo que no entiende en vez de romper la bandeja', () => {
		const activeFilters = parsePlatformSupportFilters(
			new URLSearchParams('status=INVENTADO&page=-4&q=')
		);

		expect(activeFilters).toEqual({ status: null, q: null, page: 1 });
	});

	it('sin parámetros, muestra todo desde la primera página', () => {
		expect(parsePlatformSupportFilters(new URLSearchParams(''))).toEqual({
			status: null,
			q: null,
			page: 1
		});
	});
});
