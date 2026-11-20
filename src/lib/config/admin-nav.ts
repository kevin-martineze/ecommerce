// Tipos
import type { Component } from 'svelte';
import type { MemberRole } from '$lib/domain/account';

// Iconos
import BellRing from '@lucide/svelte/icons/bell-ring';
import Boxes from '@lucide/svelte/icons/boxes';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Globe from '@lucide/svelte/icons/globe';
import Images from '@lucide/svelte/icons/images';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import LifeBuoy from '@lucide/svelte/icons/life-buoy';
import Paintbrush from '@lucide/svelte/icons/paintbrush';
import Palette from '@lucide/svelte/icons/palette';
import Receipt from '@lucide/svelte/icons/receipt';
import Settings from '@lucide/svelte/icons/settings';
import Shirt from '@lucide/svelte/icons/shirt';
import Ticket from '@lucide/svelte/icons/ticket';
import Truck from '@lucide/svelte/icons/truck';
import UserRound from '@lucide/svelte/icons/user-round';
import Users from '@lucide/svelte/icons/users';
import Wallet from '@lucide/svelte/icons/wallet';

/** Un contador al lado del enlace: pedidos pendientes, respuestas sin leer. */
export type NavCounter = 'pendingOrders' | 'supportUnread';

export interface NavLink {
	href: string;
	label: string;
	icon: Component;
	counter?: NavCounter;
	/** Solo lo ve la dueña (`owner`). */
	ownerOnly?: boolean;
}

export interface NavGroup {
	/** Sin título: el grupo del día a día, arriba. */
	title: string | null;
	links: NavLink[];
}

/**
 * La barra lateral del panel, en tres grupos: lo del día a día arriba y sin
 * título, lo que se configura una vez en «Tienda», y lo administrativo en
 * «Cuenta».
 */
export const ADMIN_NAV: NavGroup[] = [
	{
		title: null,
		links: [
			{ href: '/admin', label: 'Resumen', icon: LayoutDashboard },
			{ href: '/admin/orders', label: 'Pedidos', icon: Receipt, counter: 'pendingOrders' },
			{ href: '/admin/products', label: 'Productos', icon: Shirt },
			{ href: '/admin/inventory', label: 'Inventario', icon: Boxes },
			{ href: '/admin/collections', label: 'Colecciones', icon: Images }
		]
	},
	{
		title: 'Tienda',
		links: [
			{ href: '/admin/design', label: 'Diseño', icon: Paintbrush },
			{ href: '/admin/catalogs', label: 'Catálogos', icon: Palette },
			{ href: '/admin/coupons', label: 'Cupones', icon: Ticket },
			{ href: '/admin/shipping', label: 'Envíos', icon: Truck },
			{ href: '/admin/domain', label: 'Dominio', icon: Globe, ownerOnly: true },
			{ href: '/admin/restock-alerts', label: 'Avisos', icon: BellRing }
		]
	},
	{
		title: 'Cuenta',
		links: [
			{ href: '/admin/support', label: 'Soporte', icon: LifeBuoy, counter: 'supportUnread' },
			{ href: '/admin/settings', label: 'Ajustes', icon: Settings },
			{ href: '/admin/team', label: 'Equipo', icon: Users },
			{ href: '/admin/payments', label: 'Pagos', icon: Wallet },
			{ href: '/admin/plan', label: 'Plan', icon: CreditCard },
			{ href: '/admin/account', label: 'Mi cuenta', icon: UserRound }
		]
	}
];

/** Los grupos que ve un rol: sin los enlaces que no le tocan, ni grupos vacíos. */
export function navFor(groups: NavGroup[], role: MemberRole): NavGroup[] {
	return groups
		.map((group) => ({
			...group,
			links: group.links.filter((link) => !link.ownerOnly || role === 'owner')
		}))
		.filter((group) => group.links.length > 0);
}

/**
 * Si un enlace es la página actual. La raíz de una sección (`/admin`) solo
 * cuenta exacta; las demás también por sus subpáginas (`/admin/orders/12`).
 */
export function isActiveLink(pathname: string, href: string, root = '/admin'): boolean {
	if (href === root) return pathname === root;

	return pathname === href || pathname.startsWith(`${href}/`);
}

/** Lo que el cascarón del panel muestra de la sesión y la tienda. */
export interface AdminShell {
	storeName: string;
	/** Logo de la tienda que se administra. Null: la barra muestra el nombre. */
	storeLogo: string | null;
	/** La dirección pública de la tienda: el nombre en la barra lleva ahí. */
	storeUrl: string;
	role: MemberRole;
	email: string;
	otherStores: { id: string; name: string }[];
	isPlatformAdmin: boolean;
	counters: Record<NavCounter, number>;
}
