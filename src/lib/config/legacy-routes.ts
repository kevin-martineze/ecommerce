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

/**
 * Los parámetros de la URL que se renombraron. Ninguna clave nueva coincide con
 * una vieja, así que se traducen en cualquier ruta.
 */
const LEGACY_PARAMS: Readonly<Record<string, string>> = {
	ajustes: 'theme',
	aviso: 'notice',
	bajo: 'low',
	bienvenida: 'welcome',
	categoria: 'category',
	coleccion: 'collection',
	concepto: 'concept',
	esquinas: 'corners',
	estado: 'status',
	galeria: 'gallery',
	letras: 'fonts',
	mes: 'month',
	monto: 'amount',
	opcion: 'option',
	orden: 'sort',
	pagina: 'page',
	plantilla: 'template',
	producto: 'product',
	referencia: 'reference',
	seccion: 'section',
	solo: 'once',
	tienda: 'store',
	volver: 'returnTo'
};

function movedPath(pathname: string): string | null {
	for (const [from, to] of LEGACY_ROUTES) {
		if (pathname === from) return to;
		if (pathname.startsWith(`${from}/`)) return to + pathname.slice(from.length);
	}

	return null;
}

/**
 * La ruta y la búsqueda nuevas de una URL vieja (`/shop?category=x`), o `null`
 * si ni la ruta ni sus parámetros se mudaron.
 */
export function legacyRedirect(url: URL): string | null {
	const path = movedPath(url.pathname);
	const params = new URLSearchParams();
	let renamed = false;

	for (const [key, value] of url.searchParams) {
		const next = LEGACY_PARAMS[key];

		if (next) renamed = true;
		params.append(next ?? key, value);
	}

	if (!path && !renamed) return null;

	const search = renamed ? params.toString() : url.search.slice(1);

	return (path ?? url.pathname) + (search ? `?${search}` : '');
}
