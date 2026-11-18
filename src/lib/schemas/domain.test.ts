// Librerías
import { describe, expect, it } from 'vitest';

// Dominio
import { domainSchema, cleanDomain } from '$lib/schemas/domain';

const rejects = (raw: string, root = 'globerce.store') => {
	const result = domainSchema(root).safeParse(raw);
	return result.success ? null : result.error.issues[0]?.message;
};

describe('limpiarDominio', () => {
	it('quita protocolo, ruta, espacios, mayúsculas y punto final', () => {
		expect(cleanDomain('  https://www.Mitienda.com/ruta/?x=1 ')).toBe('www.mitienda.com');
		expect(cleanDomain('mitienda.com.')).toBe('mitienda.com');
	});
});

describe('dominioSchema', () => {
	it('acepta un dominio propio y lo devuelve limpio', () => {
		const result = domainSchema('globerce.store').safeParse('https://WWW.Mitienda.co/shop');

		expect(result).toEqual({ success: true, data: 'www.mitienda.co' });
	});

	it('rechaza lo que no es un nombre de dominio', () => {
		expect(rejects('')).toMatch(/Escribe el dominio/);
		expect(rejects('mitienda')).toMatch(/extensión/);
		expect(rejects('192.168.0.1')).toMatch(/dirección IP/);
		expect(rejects('mi tienda.com')).toMatch(/no es válido/);
		expect(rejects('a'.repeat(260) + '.com')).toMatch(/demasiado largo/);
	});

	it('rechaza localhost y vercel.app', () => {
		expect(rejects('localhost')).toMatch(/no se puede usar/);
		expect(rejects('app.vercel.app')).toMatch(/no se puede usar/);
	});

	it('rechaza el dominio raíz y sus subdominios', () => {
		expect(rejects('globerce.store')).toMatch(/es de Globerce/);
		expect(rejects('www.globerce.store')).toMatch(/es de Globerce/);
		expect(rejects('mitienda.com', 'globerce.store')).toBeNull();
	});

	it('sin dominio raíz solo valida el formato', () => {
		expect(domainSchema(undefined).safeParse('globerce.store').success).toBe(true);
	});
});
