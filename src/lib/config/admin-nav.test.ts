// Librerías
import { describe, expect, it } from 'vitest';

// Dominio
import { ADMIN_NAV, isActiveLink, navFor } from '$lib/config/admin-nav';

describe('navFor', () => {
	const hrefs = (role: 'owner' | 'staff') =>
		navFor(ADMIN_NAV, role).flatMap((group) => group.links.map((link) => link.href));

	it('le muestra el dominio solo a la dueña', () => {
		expect(hrefs('owner')).toContain('/admin/domain');
		expect(hrefs('staff')).not.toContain('/admin/domain');
	});

	it('no deja grupos vacíos', () => {
		const groups = navFor([{ title: 'Solo dueña', links: [ADMIN_NAV[1].links[4]] }], 'staff');

		expect(groups).toEqual([]);
	});
});

describe('isActiveLink', () => {
	it('la raíz solo cuenta exacta', () => {
		expect(isActiveLink('/admin', '/admin')).toBe(true);
		expect(isActiveLink('/admin/orders', '/admin')).toBe(false);
	});

	it('las secciones cuentan con sus subpáginas, no con prefijos parecidos', () => {
		expect(isActiveLink('/admin/orders/12', '/admin/orders')).toBe(true);
		expect(isActiveLink('/admin/products/new', '/admin/products')).toBe(true);
		expect(isActiveLink('/admin/payments-x', '/admin/payments')).toBe(false);
	});
});
