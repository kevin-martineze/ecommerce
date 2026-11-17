// Librerías
import { describe, expect, it } from 'vitest';

// Dominio
import { legacyRedirect } from '$lib/config/legacy-routes';

function at(path: string): URL {
	return new URL(path, 'https://boutique.globerce.store');
}

describe('legacyRedirect', () => {
	it.each([
		['/admin/pedidos', '/admin/orders'],
		['/admin/pedidos/1042', '/admin/orders/1042'],
		['/admin/productos/nuevo', '/admin/products/new'],
		['/admin/productos/abc', '/admin/products/abc'],
		['/admin/restablecer', '/admin/reset-password'],
		['/plataforma/tiendas/7', '/platform/stores/7'],
		['/tienda', '/shop'],
		['/tienda/vestido-lino', '/shop/vestido-lino'],
		['/pedido/1042', '/order/1042'],
		['/vista-previa/producto', '/preview/product'],
		['/pagos/simulado', '/payments/simulated']
	])('%s se mudó a %s', (from, to) => {
		expect(legacyRedirect(at(from))).toBe(to);
	});

	it('copia el slug tal cual aunque sea una palabra de una ruta vieja', () => {
		expect(legacyRedirect(at('/tienda/pedido'))).toBe('/shop/pedido');
	});

	it('traduce los parámetros y conserva los demás', () => {
		expect(legacyRedirect(at('/tienda?categoria=vestidos&pagina=2&q=lino'))).toBe(
			'/shop?category=vestidos&page=2&q=lino'
		);
	});

	it('traduce los parámetros aunque la ruta no se haya mudado', () => {
		expect(legacyRedirect(at('/?plantilla=editorial&solo=1'))).toBe('/?template=editorial&once=1');
	});

	it('conserva la búsqueda tal cual si solo se mudó la ruta', () => {
		expect(legacyRedirect(at('/pedido/1042?t=abc'))).toBe('/order/1042?t=abc');
	});

	it.each(['/', '/shop', '/admin', '/admin/orders', '/tiendas', '/pedidos'])(
		'%s no se toca',
		(pathname) => {
			expect(legacyRedirect(at(pathname))).toBeNull();
		}
	);
});
