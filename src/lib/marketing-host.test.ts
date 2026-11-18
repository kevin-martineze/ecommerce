// Librerías
import { describe, expect, it } from 'vitest';

// Utilidades
import { isSharedPath, MARKETING_HOME, rerouteForHost } from '$lib/marketing-host';

describe('rerouteForHost', () => {
	it('en el dominio raíz, la portada es el sitio comercial', () => {
		expect(rerouteForHost({ pathname: '/', isStore: false })).toBe(MARKETING_HOME);
	});

	it('en el host de una tienda, la portada sigue siendo la tienda', () => {
		expect(rerouteForHost({ pathname: '/', isStore: true })).toBeUndefined();
	});

	it('el sitio comercial no se abre desde una tienda', () => {
		expect(rerouteForHost({ pathname: MARKETING_HOME, isStore: true })).toBe('/not-found');
	});

	it('las demás rutas quedan como están', () => {
		for (const isStore of [false, true]) {
			expect(rerouteForHost({ pathname: '/signup', isStore })).toBeUndefined();
			expect(rerouteForHost({ pathname: '/admin/products', isStore })).toBeUndefined();
		}
	});
});

describe('isSharedPath', () => {
	it('el panel, la consola y el registro responden en cualquier host', () => {
		expect(isSharedPath('/admin')).toBe(true);
		expect(isSharedPath('/admin/orders/1')).toBe(true);
		expect(isSharedPath('/platform/stores')).toBe(true);
		expect(isSharedPath('/signup')).toBe(true);
	});

	it('la tienda no', () => {
		expect(isSharedPath('/shop')).toBe(false);
		expect(isSharedPath('/administrar')).toBe(false);
	});
});

describe('las páginas legales', () => {
	it('se sirven en el dominio raíz y no existen en una tienda', () => {
		expect(rerouteForHost({ pathname: '/terms', isStore: false })).toBeUndefined();
		expect(rerouteForHost({ pathname: '/privacy', isStore: true })).toBe('/not-found');
		expect(rerouteForHost({ pathname: '/contact', isStore: true })).toBe('/not-found');
	});
});
