// Librerías
import { z } from 'zod';

// Dominio
import {
	parseNotification,
	type AppNotification,
	type NotificationInbox
} from '$lib/domain/notifications';

/**
 * El centro de avisos: la campana del panel y de la consola.
 *
 * Junta dos fuentes:
 *
 * - **La bandeja que trae la carga del layout** (`inbox()`): los últimos
 *   avisos y el total sin leer. Se vuelve a cargar sola después de cada form
 *   action, así que marcar leído no necesita estado propio acá.
 * - **Lo que llega en vivo** por el stream, desde que se abrió la página. En
 *   cuanto la carga lo trae, se muestra la versión de la carga (que sabe si ya
 *   se leyó) y no se cuenta dos veces.
 *
 * El stream lo abre el navegador directo contra la API con un ticket de 60 s
 * que le pide a su propio servidor (`ticketUrl`); ver CLAUDE.md, reglas 11 y
 * 16. Si se cae, reintenta con espera creciente y pide un ticket nuevo cada
 * vez: el viejo ya venció. Al reconectar manda el último aviso que conoce
 * (`after`) y la API le reenvía lo que se perdió.
 */

export type StreamStatus = 'idle' | 'connecting' | 'live' | 'offline';

/** Lo que el centro usa de `EventSource`. Las pruebas lo reemplazan. */
export interface StreamSource {
	onopen: ((event: Event) => void) | null;
	onerror: ((event: Event) => void) | null;
	addEventListener(type: 'notification' | 'missed', listener: (event: MessageEvent) => void): void;
	close(): void;
}

export interface NotificationCenterOptions {
	/** La bandeja de la carga del layout. Un getter, para que siga a `data`. */
	inbox: () => NotificationInbox;
	/** El endpoint de ESTE sitio que emite el ticket (`/admin/notifications/ticket`). */
	ticketUrl: string;
	/** Para avisar con un toast. Solo lo nuevo en vivo, no lo reenviado al reconectar (`missed`). */
	onNotification?: (notification: AppNotification) => void;
	/** Cuántos avisos muestra la campana. */
	limit?: number;
	fetch?: typeof fetch;
	openSource?: (url: string) => StreamSource;
	setTimeout?: (run: () => void, ms: number) => ReturnType<typeof setTimeout>;
	clearTimeout?: (timer: ReturnType<typeof setTimeout>) => void;
}

/** Espera antes de cada reintento: rápido al principio, sin martillar después. */
export const RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 60_000];

/** Con la pestaña oculta más que esto, se cierra la conexión hasta que vuelva. */
export const HIDDEN_GRACE_MS = 5 * 60_000;

const ticketSchema = z.object({ url: z.string().url(), ticket: z.string().min(1) });

export class NotificationCenter {
	status = $state<StreamStatus>('idle');

	/** Lo que llegó por el stream desde que se abrió la página, del más nuevo al más viejo. */
	private live = $state<AppNotification[]>([]);

	/** Los avisos de la campana: lo cargado y lo nuevo, sin repetir, del más nuevo al más viejo. */
	readonly items = $derived.by(() => {
		const loaded = this.options.inbox().items;
		const loadedIds = loaded.map((item) => item.id);
		const fresh = this.live.filter((item) => !loadedIds.includes(item.id));

		return [...fresh, ...loaded]
			.toSorted((a, b) => b.created_at.localeCompare(a.created_at))
			.slice(0, this.limit);
	});

	/** Sin leer: los de la bandeja más los nuevos que la carga todavía no trae. */
	readonly unread = $derived.by(() => {
		const inbox = this.options.inbox();
		const loadedIds = inbox.items.map((item) => item.id);
		const freshUnread = this.live.filter(
			(item) => !loadedIds.includes(item.id) && item.read_at === null
		).length;

		return inbox.unread + freshUnread;
	});

	private readonly limit: number;
	private readonly fetcher: typeof fetch;
	private readonly openSource: (url: string) => StreamSource;
	private readonly schedule: (run: () => void, ms: number) => ReturnType<typeof setTimeout>;
	private readonly cancel: (timer: ReturnType<typeof setTimeout>) => void;

	private source: StreamSource | null = null;
	private retryTimer: ReturnType<typeof setTimeout> | null = null;
	private hiddenTimer: ReturnType<typeof setTimeout> | null = null;
	private attempt = 0;
	private running = false;
	/** Cambia en cada conexión: una respuesta de ticket que llega tarde no abre nada. */
	private generation = 0;

	constructor(private readonly options: NotificationCenterOptions) {
		this.limit = options.limit ?? 20;
		this.fetcher = options.fetch ?? ((input, init) => fetch(input, init));
		this.openSource = options.openSource ?? ((url) => new EventSource(url));
		this.schedule = options.setTimeout ?? ((run, ms) => setTimeout(run, ms));
		this.cancel = options.clearTimeout ?? ((timer) => clearTimeout(timer));
	}

	/** Abre la conexión. Llamarlo dos veces no abre dos. */
	start(): void {
		if (this.running) return;

		this.running = true;
		this.attempt = 0;
		void this.connect();
	}

	/** Cierra todo: conexión y temporizadores. */
	stop(): void {
		this.running = false;
		this.generation += 1;
		this.closeSource();
		this.clearTimers();
		this.status = 'idle';
	}

	/**
	 * La pestaña se ocultó o volvió. Oculta un rato largo, se cierra para no
	 * gastar una conexión que nadie mira; al volver, reconecta y recupera lo
	 * que llegó mientras tanto.
	 */
	visibilityChanged(hidden: boolean): void {
		if (hidden) {
			if (this.hiddenTimer || !this.running) return;

			this.hiddenTimer = this.schedule(() => {
				this.hiddenTimer = null;
				this.stop();
			}, HIDDEN_GRACE_MS);

			return;
		}

		if (this.hiddenTimer) {
			this.cancel(this.hiddenTimer);
			this.hiddenTimer = null;
		}

		this.start();
	}

	/** El aviso más nuevo que ya conoce: desde ahí pide lo perdido al reconectar. */
	private newestId(): string | null {
		return this.items[0]?.id ?? null;
	}

	private async connect(): Promise<void> {
		const generation = ++this.generation;

		this.status = 'connecting';
		this.closeSource();

		const ticket = await this.requestTicket();

		// Mientras se esperaba el ticket, alguien llamó a `stop` o reconectó.
		if (generation !== this.generation || !this.running) return;

		if (!ticket) {
			this.retryLater();

			return;
		}

		// La dirección se arma a mano: no es estado, es una línea para abrir el stream.
		const after = this.newestId();
		const query = [`ticket=${encodeURIComponent(ticket.ticket)}`];

		if (after) query.push(`after=${encodeURIComponent(after)}`);

		const source = this.openSource(`${ticket.url}?${query.join('&')}`);

		this.source = source;

		source.onopen = () => {
			this.attempt = 0;
			this.status = 'live';
		};

		// Lo nuevo se anuncia; lo que se perdió mientras no había conexión
		// (`missed`) solo se agrega a la campana: diez toasts seguidos al volver
		// no le dicen nada a nadie.
		source.addEventListener('notification', (event) => this.receive(event.data, true));
		source.addEventListener('missed', (event) => this.receive(event.data, false));

		// `EventSource` reintentaría solo con la misma URL, y el ticket ya
		// venció: se cierra y se reconecta con uno nuevo.
		source.onerror = () => {
			if (this.source !== source) return;

			this.closeSource();
			this.status = 'offline';
			this.retryLater();
		};
	}

	private receive(data: unknown, announce: boolean): void {
		const notification = parseNotification(safeJson(data));

		if (!notification) return;

		const known =
			this.live.some((item) => item.id === notification.id) ||
			this.options.inbox().items.some((item) => item.id === notification.id);

		if (known) return;

		this.live = [notification, ...this.live];

		if (announce) this.options.onNotification?.(notification);
	}

	private async requestTicket(): Promise<{ url: string; ticket: string } | null> {
		try {
			const response = await this.fetcher(this.options.ticketUrl, {
				method: 'POST',
				headers: { accept: 'application/json' }
			});

			if (!response.ok) return null;

			const parsed = ticketSchema.safeParse(await response.json());

			return parsed.success ? parsed.data : null;
		} catch {
			return null;
		}
	}

	private retryLater(): void {
		if (!this.running) return;

		this.status = 'offline';

		const delay = RETRY_DELAYS_MS[Math.min(this.attempt, RETRY_DELAYS_MS.length - 1)] ?? 60_000;

		this.attempt += 1;

		if (this.retryTimer) this.cancel(this.retryTimer);

		this.retryTimer = this.schedule(() => {
			this.retryTimer = null;
			void this.connect();
		}, delay);
	}

	private closeSource(): void {
		const source = this.source;

		this.source = null;
		source?.close();
	}

	private clearTimers(): void {
		if (this.retryTimer) this.cancel(this.retryTimer);
		if (this.hiddenTimer) this.cancel(this.hiddenTimer);

		this.retryTimer = null;
		this.hiddenTimer = null;
	}
}

function safeJson(text: unknown): unknown {
	if (typeof text !== 'string') return null;

	try {
		const value: unknown = JSON.parse(text);

		return value;
	} catch {
		return null;
	}
}
