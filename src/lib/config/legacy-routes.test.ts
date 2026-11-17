// Librerías
import { describe, expect, it } from 'vitest';

// Dominio
import { legacyRedirect } from '$lib/config/legacy-routes';

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
		expect(legacyRedirect(from)).toBe(to);
	});

	it('copia el slug tal cual aunque sea una palabra de una ruta vieja', () => {
		expect(legacyRedirect('/tienda/pedido')).toBe('/shop/pedido');
	});

	it.each(['/', '/shop', '/admin', '/admin/orders', '/tiendas', '/pedidos'])(
		'%s no se toca',
		(pathname) => {
			expect(legacyRedirect(pathname)).toBeNull();
		}
	);
});
