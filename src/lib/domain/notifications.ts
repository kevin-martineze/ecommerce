// Librerías
import { z } from 'zod';

// Utilidades
import { formatMoney } from '$lib/utils/money';

/**
 * Avisos del panel y de la consola: pedido nuevo, pago, tienda creada…
 *
 * Los tipos se guardan en inglés, igual que la API, y se traducen al pintarlos
 * con `notificationText`. Un aviso nunca trae datos de una clienta: solo ids,
 * números, montos y nombres de tienda. El detalle se ve al abrir el enlace.
 */

interface NotificationMeta {
	id: string;
	created_at: string;
	/** Null: sin leer. */
	read_at: string | null;
}

export type AppNotification = NotificationMeta &
	(
		| {
				type: 'ORDER_PLACED';
				order_id: string;
				number: number;
				total: number;
				item_count: number;
				paid: boolean;
		  }
		| { type: 'ORDER_PAID'; order_id: string; number: number; total: number }
		| {
				type: 'STORE_CREATED';
				store_id: string;
				store_name: string;
				slug: string;
				user_id: string;
				new_account: boolean;
		  }
		| {
				type: 'USER_REGISTERED';
				user_id: string;
				store_id: string | null;
				store_name: string | null;
		  }
		| {
				type: 'SUBSCRIPTION_PAID' | 'SUBSCRIPTION_FAILED';
				store_id: string;
				store_name: string;
				amount: number;
				plan_code: string;
		  }
		| {
				type: 'SUPPORT_TICKET_OPENED' | 'SUPPORT_OWNER_REPLIED';
				ticket_id: string;
				store_id: string;
				store_name: string;
		  }
	);

export type NotificationType = AppNotification['type'];

export interface NotificationInbox {
	/** Del más nuevo al más viejo. */
	items: AppNotification[];
	/** No leídos de toda la bandeja, no solo de esta página. */
	unread: number;
	/** Cursor de la página siguiente (`?before=`). Null: no hay más. */
	next_before: string | null;
}

/** La bandeja cuando la API no respondió: la campana se ve, vacía. */
export const EMPTY_INBOX: NotificationInbox = { items: [], unread: 0, next_before: null };

/** Con qué abrir el stream de avisos (ver `ecommerce-api`, ARCHITECTURE § 15). */
export interface StreamTicket {
	url: string;
	ticket: string;
}

/**
 * Lo que da `PushSubscription.toJSON()` en el navegador: a dónde manda el
 * servicio push y con qué llaves se cifra. Llega al servidor por form action.
 */
export interface PushDeviceSubscription {
	endpoint: string;
	keys: { p256dh: string; auth: string };
}

const meta = {
	id: z.string(),
	createdAt: z.string(),
	readAt: z.string().nullable()
};

const subscriptionData = z.object({
	storeId: z.string(),
	storeName: z.string(),
	amountCop: z.number(),
	planCode: z.string()
});

const supportData = z.object({
	ticketId: z.string(),
	storeId: z.string(),
	storeName: z.string()
});

const wireSchema = z.discriminatedUnion('type', [
	z.object({
		...meta,
		type: z.literal('ORDER_PLACED'),
		data: z.object({
			orderId: z.string(),
			number: z.number(),
			total: z.number(),
			itemCount: z.number(),
			paid: z.boolean()
		})
	}),
	z.object({
		...meta,
		type: z.literal('ORDER_PAID'),
		data: z.object({ orderId: z.string(), number: z.number(), total: z.number() })
	}),
	z.object({
		...meta,
		type: z.literal('STORE_CREATED'),
		data: z.object({
			storeId: z.string(),
			storeName: z.string(),
			slug: z.string(),
			userId: z.string(),
			newAccount: z.boolean()
		})
	}),
	z.object({
		...meta,
		type: z.literal('USER_REGISTERED'),
		data: z.object({
			userId: z.string(),
			storeId: z.string().nullable(),
			storeName: z.string().nullable()
		})
	}),
	z.object({ ...meta, type: z.literal('SUBSCRIPTION_PAID'), data: subscriptionData }),
	z.object({ ...meta, type: z.literal('SUBSCRIPTION_FAILED'), data: subscriptionData }),
	z.object({ ...meta, type: z.literal('SUPPORT_TICKET_OPENED'), data: supportData }),
	z.object({ ...meta, type: z.literal('SUPPORT_OWNER_REPLIED'), data: supportData })
]);

type Wire = z.infer<typeof wireSchema>;

function fromWire(wire: Wire): AppNotification {
	const base = { id: wire.id, created_at: wire.createdAt, read_at: wire.readAt };

	switch (wire.type) {
		case 'ORDER_PLACED':
			return {
				...base,
				type: wire.type,
				order_id: wire.data.orderId,
				number: wire.data.number,
				total: wire.data.total,
				item_count: wire.data.itemCount,
				paid: wire.data.paid
			};
		case 'ORDER_PAID':
			return {
				...base,
				type: wire.type,
				order_id: wire.data.orderId,
				number: wire.data.number,
				total: wire.data.total
			};
		case 'STORE_CREATED':
			return {
				...base,
				type: wire.type,
				store_id: wire.data.storeId,
				store_name: wire.data.storeName,
				slug: wire.data.slug,
				user_id: wire.data.userId,
				new_account: wire.data.newAccount
			};
		case 'USER_REGISTERED':
			return {
				...base,
				type: wire.type,
				user_id: wire.data.userId,
				store_id: wire.data.storeId,
				store_name: wire.data.storeName
			};
		case 'SUBSCRIPTION_PAID':
		case 'SUBSCRIPTION_FAILED':
			return {
				...base,
				type: wire.type,
				store_id: wire.data.storeId,
				store_name: wire.data.storeName,
				amount: wire.data.amountCop,
				plan_code: wire.data.planCode
			};
		case 'SUPPORT_TICKET_OPENED':
		case 'SUPPORT_OWNER_REPLIED':
			return {
				...base,
				type: wire.type,
				ticket_id: wire.data.ticketId,
				store_id: wire.data.storeId,
				store_name: wire.data.storeName
			};
	}
}

/**
 * Un aviso tal como lo manda la API, o null si no tiene una forma conocida.
 *
 * Vive en el dominio y no en `$lib/server/api/` porque lo usan los dos lados:
 * el servidor al cargar la bandeja y el navegador al leer el stream, que es la
 * única respuesta de la API que llega directo al navegador (CLAUDE.md, regla 16).
 * Un tipo nuevo que este frontend todavía no conoce se descarta, no rompe nada.
 */
export function parseNotification(value: unknown): AppNotification | null {
	const parsed = wireSchema.safeParse(value);

	return parsed.success ? fromWire(parsed.data) : null;
}

/** «1 producto», «3 productos». */
function products(count: number): string {
	return `${count} ${count === 1 ? 'producto' : 'productos'}`;
}

/** Lo que se lee del aviso: el título y una línea de detalle. */
export function notificationText(notification: AppNotification): { title: string; body: string } {
	switch (notification.type) {
		case 'ORDER_PLACED':
			return {
				title: `Pedido #${notification.number} nuevo`,
				body: [
					formatMoney(notification.total),
					products(notification.item_count),
					notification.paid ? 'Pagado' : 'Por pagar'
				].join(' · ')
			};
		case 'ORDER_PAID':
			return {
				title: `Te pagaron el pedido #${notification.number}`,
				body: formatMoney(notification.total)
			};
		case 'STORE_CREATED':
			return {
				title: `Nueva tienda: ${notification.store_name}`,
				body: notification.new_account ? 'Cuenta nueva' : 'De una cuenta que ya existía'
			};
		case 'USER_REGISTERED':
			return {
				title: 'Cuenta nueva',
				body: notification.store_name
					? `Entró al equipo de ${notification.store_name}`
					: 'Todavía sin tienda'
			};
		case 'SUBSCRIPTION_PAID':
			return {
				title: `${notification.store_name} pagó su plan`,
				body: `${formatMoney(notification.amount)} · plan ${notification.plan_code}`
			};
		case 'SUBSCRIPTION_FAILED':
			return {
				title: `No se pudo cobrar el plan de ${notification.store_name}`,
				body: `${formatMoney(notification.amount)} · plan ${notification.plan_code}`
			};
		case 'SUPPORT_TICKET_OPENED':
			return {
				title: `Caso de soporte nuevo de ${notification.store_name}`,
				body: 'Ábrelo para leerlo'
			};
		case 'SUPPORT_OWNER_REPLIED':
			return {
				title: `${notification.store_name} escribió en soporte`,
				body: 'Ábrelo para leerlo'
			};
	}
}

/** A dónde lleva el aviso. Siempre una ruta de este mismo sitio. */
export function notificationHref(notification: AppNotification): string {
	switch (notification.type) {
		case 'ORDER_PLACED':
		case 'ORDER_PAID':
			return `/admin/orders/${encodeURIComponent(notification.order_id)}`;
		case 'STORE_CREATED':
		case 'SUBSCRIPTION_PAID':
		case 'SUBSCRIPTION_FAILED':
			return `/platform/stores/${encodeURIComponent(notification.store_id)}`;
		case 'USER_REGISTERED':
			return `/platform/users/${encodeURIComponent(notification.user_id)}`;
		case 'SUPPORT_TICKET_OPENED':
		case 'SUPPORT_OWNER_REPLIED':
			return `/platform/support/${encodeURIComponent(notification.store_id)}/${encodeURIComponent(notification.ticket_id)}`;
	}
}

/** Los avisos que piden atención: se pintan con el color de alerta. */
export function isWarning(notification: AppNotification): boolean {
	return notification.type === 'SUBSCRIPTION_FAILED';
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const dayFormatter = new Intl.DateTimeFormat('es-CO', {
	day: 'numeric',
	month: 'short',
	timeZone: 'America/Bogota'
});

/** «Ahora», «hace 5 min», «hace 3 h», «ayer», «12 nov». */
export function relativeTime(iso: string, now: Date = new Date()): string {
	const elapsed = now.getTime() - new Date(iso).getTime();

	if (elapsed < MINUTE) return 'Ahora';
	if (elapsed < HOUR) return `hace ${Math.floor(elapsed / MINUTE)} min`;
	if (elapsed < DAY) return `hace ${Math.floor(elapsed / HOUR)} h`;
	if (elapsed < 2 * DAY) return 'ayer';

	return dayFormatter.format(new Date(iso));
}
