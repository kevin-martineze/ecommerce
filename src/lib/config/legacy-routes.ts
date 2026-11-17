/**
 * Las URLs en español de antes del refactor (noviembre de 2026) y a dónde se
 * mudaron. `hooks.server.ts` responde un 308 con la nueva, así no se rompen
 * los enlaces guardados, los compartidos por WhatsApp ni los que tiene Google.
 *
 * Cada entrada es un prefijo: lo que viene detrás (un slug, un id) se copia
 * igual. Nunca se traduce un segmento suelto, porque un slug de producto
 * puede llamarse «pedido».
 */
const LEGACY_ROUTES: ReadonlyArray<readonly [string, string]> = [
	['/admin/personalizar', '/admin/design'],
	['/admin/ajustes', '/admin/settings'],
	['/admin/avisos', '/admin/restock-alerts'],
	['/admin/bienvenida', '/admin/welcome'],
	['/admin/catalogos', '/admin/catalogs'],
	['/admin/colecciones', '/admin/collections'],
	['/admin/cuenta', '/admin/account'],
	['/admin/cupones', '/admin/coupons'],
	['/admin/dominio', '/admin/domain'],
	['/admin/envios', '/admin/shipping'],
	['/admin/equipo', '/admin/team'],
	['/admin/inventario', '/admin/inventory'],
	['/admin/pagos', '/admin/payments'],
	['/admin/pedidos', '/admin/orders'],
	['/admin/portada', '/admin/cover'],
	['/admin/productos/nuevo', '/admin/products/new'],
	['/admin/productos', '/admin/products'],
	['/admin/soporte', '/admin/support'],
	['/admin/cambiar-tienda', '/admin/switch-store'],
	['/admin/invitacion', '/admin/invitation'],
	['/admin/recuperar', '/admin/forgot-password'],
	['/admin/restablecer', '/admin/reset-password'],
	['/plataforma/tiendas', '/platform/stores'],
	['/plataforma/pagos', '/platform/payments'],
	['/plataforma/soporte', '/platform/support'],
	['/plataforma', '/platform'],
	['/vista-previa/carrito', '/preview/cart'],
	['/vista-previa/coleccion', '/preview/collection'],
	['/vista-previa/producto', '/preview/product'],
	['/vista-previa', '/preview'],
	['/pagos/simulado', '/payments/simulated'],
	['/tienda', '/shop'],
	['/colecciones', '/collections'],
	['/carrito', '/cart'],
	['/favoritos', '/favorites'],
	['/pedido', '/order'],
	['/asistente', '/assistant'],
	['/registro', '/signup'],
	['/inicio', '/home'],
	['/contacto', '/contact'],
	['/privacidad', '/privacy'],
	['/terminos', '/terms']
];

/** La ruta nueva de una URL vieja, o `null` si la ruta no se mudó. */
export function legacyRedirect(pathname: string): string | null {
	for (const [from, to] of LEGACY_ROUTES) {
		if (pathname === from) return to;
		if (pathname.startsWith(`${from}/`)) return to + pathname.slice(from.length);
	}

	return null;
}
