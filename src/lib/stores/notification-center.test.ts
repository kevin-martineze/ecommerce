// Librerías
import { describe, expect, it, vi } from 'vitest';

// Estado
import {
	HIDDEN_GRACE_MS,
	NotificationCenter,
	RETRY_DELAYS_MS,
	type StreamSource
} from '$lib/stores/notification-center.svelte';

// Dominio
import {
	EMPTY_INBOX,
	parseNotification,
	type AppNotification,
	type NotificationInbox
} from '$lib/domain/notifications';

/** Un `EventSource` de mentiras: la prueba decide cuándo abre, llega algo o se cae. */
class FakeSource implements StreamSource {
	onopen: ((event: Event) => void) | null = null;
	onerror: ((event: Event) => void) | null = null;
	closed = false;
	private readonly listeners = new Map<string, ((event: MessageEvent) => void)[]>();

	constructor(readonly url: string) {}

	addEventListener(type: 'notification' | 'missed', listener: (event: MessageEvent) => void): void {
		this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
	}

	close(): void {
		this.closed = true;
	}

	open(): void {
		this.onopen?.(new Event('open'));
	}

	emit(type: 'notification' | 'missed', data: unknown): void {
		const event = new MessageEvent(type, { data: JSON.stringify(data) });

		this.listeners.get(type)?.forEach((listener) => listener(event));
	}

	fail(): void {
		this.onerror?.(new Event('error'));
	}
}

/** Temporizadores a mano: la prueba los dispara cuando quiere. */
class FakeClock {
	readonly pending = new Map<ReturnType<typeof setTimeout>, { run: () => void; ms: number }>();

	schedule = (run: () => void, ms: number): ReturnType<typeof setTimeout> => {
		// Un identificador de verdad, ya cancelado: solo sirve de llave.
		const timer = setTimeout(() => {}, 0);

		clearTimeout(timer);
		this.pending.set(timer, { run, ms });

		return timer;
	};

	cancel = (timer: ReturnType<typeof setTimeout>): void => {
		this.pending.delete(timer);
	};

	delays(): number[] {
		return [...this.pending.values()].map((timer) => timer.ms);
	}

	runAll(): void {
		const timers = [...this.pending.values()];

		this.pending.clear();
		timers.forEach((timer) => timer.run());
	}
}

const TICKET = { url: 'https://api.test/v1/notifications/stream', ticket: 'abc' };

function wire(id: string, number: number, createdAt: string) {
	return {
		id,
		createdAt,
		readAt: null,
		type: 'ORDER_PAID',
		data: { orderId: `order-${number}`, number, total: 89_900 }
	};
}

function notification(id: string, number: number, createdAt: string): AppNotification {
	const parsed = parseNotification(wire(id, number, createdAt));

	if (!parsed) throw new Error('El aviso de prueba no tiene forma válida.');

	return parsed;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(options: { inbox?: NotificationInbox; ticketOk?: boolean } = {}) {
	let inbox = options.inbox ?? EMPTY_INBOX;
	const sources: FakeSource[] = [];
	const clock = new FakeClock();
	const onNotification = vi.fn();
	const fetch = vi.fn(
		async () =>
			new Response(JSON.stringify(TICKET), {
				status: options.ticketOk === false ? 503 : 200,
				headers: { 'content-type': 'application/json' }
			})
	);

	const center = new NotificationCenter({
		inbox: () => inbox,
		ticketUrl: '/admin/notifications/ticket',
		onNotification,
		fetch,
		openSource: (url) => {
			const source = new FakeSource(url);

			sources.push(source);

			return source;
		},
		setTimeout: clock.schedule,
		clearTimeout: clock.cancel
	});

	return {
		center,
		sources,
		clock,
		fetch,
		onNotification,
		setInbox: (next: NotificationInbox) => {
			inbox = next;
		},
		last: () => {
			const source = sources.at(-1);

			if (!source) throw new Error('No se abrió ninguna conexión.');

			return source;
		}
	};
}

describe('NotificationCenter', () => {
	it('pide el ticket por POST y abre el stream con él', async () => {
		const { center, fetch, last } = setup();

		center.start();
		await flush();

		expect(fetch).toHaveBeenCalledWith('/admin/notifications/ticket', {
			method: 'POST',
			headers: { accept: 'application/json' }
		});
		expect(center.status).toBe('connecting');

		last().open();

		expect(last().url).toBe(`${TICKET.url}?ticket=abc`);
		expect(center.status).toBe('live');
	});

	it('llamar start dos veces abre una sola conexión', async () => {
		const { center, sources } = setup();

		center.start();
		center.start();
		await flush();

		expect(sources).toHaveLength(1);
	});

	it('lo nuevo se suma arriba, cuenta como sin leer y se anuncia', async () => {
		const loaded = notification('a', 1, '2026-11-19T10:00:00.000Z');
		const { center, last, onNotification } = setup({
			inbox: { items: [loaded], unread: 1, next_before: null }
		});

		center.start();
		await flush();
		last().emit('notification', wire('b', 2, '2026-11-19T11:00:00.000Z'));

		expect(center.items.map((item) => item.id)).toEqual(['b', 'a']);
		expect(center.unread).toBe(2);
		expect(onNotification).toHaveBeenCalledTimes(1);
		expect(onNotification).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
	});

	it('lo perdido (`missed`) se suma pero no se anuncia', async () => {
		const { center, last, onNotification } = setup();

		center.start();
		await flush();
		last().emit('missed', wire('b', 2, '2026-11-19T11:00:00.000Z'));

		expect(center.items.map((item) => item.id)).toEqual(['b']);
		expect(onNotification).not.toHaveBeenCalled();
	});

	it('no repite lo que ya llegó ni lo que la carga ya trae', async () => {
		const loaded = notification('a', 1, '2026-11-19T10:00:00.000Z');
		const { center, last, onNotification } = setup({
			inbox: { items: [loaded], unread: 1, next_before: null }
		});

		center.start();
		await flush();
		last().emit('notification', wire('a', 1, '2026-11-19T10:00:00.000Z'));
		last().emit('notification', wire('b', 2, '2026-11-19T11:00:00.000Z'));
		last().emit('notification', wire('b', 2, '2026-11-19T11:00:00.000Z'));

		expect(center.items.map((item) => item.id)).toEqual(['b', 'a']);
		expect(onNotification).toHaveBeenCalledTimes(1);
	});

	it('cuando la carga trae el aviso en vivo, manda la versión de la carga', async () => {
		const { center, last, setInbox } = setup();

		center.start();
		await flush();
		last().emit('notification', wire('b', 2, '2026-11-19T11:00:00.000Z'));
		expect(center.unread).toBe(1);

		// La dueña lo marcó leído: la carga vuelve con él leído.
		setInbox({
			items: [{ ...notification('b', 2, '2026-11-19T11:00:00.000Z'), read_at: 'ya' }],
			unread: 0,
			next_before: null
		});

		expect(center.items).toHaveLength(1);
		expect(center.items[0]?.read_at).toBe('ya');
		expect(center.unread).toBe(0);
	});

	it('descarta lo que no tiene una forma conocida', async () => {
		const { center, last, onNotification } = setup();

		center.start();
		await flush();
		last().emit('notification', { id: 'x', type: 'ALGO_NUEVO' });

		expect(center.items).toEqual([]);
		expect(onNotification).not.toHaveBeenCalled();
	});

	it('si se cae, cierra, espera cada vez más y reconecta con ticket nuevo y `after`', async () => {
		const { center, sources, clock, fetch, last } = setup();

		center.start();
		await flush();
		last().open();
		last().emit('notification', wire('b', 2, '2026-11-19T11:00:00.000Z'));

		const first = last();

		first.fail();

		expect(first.closed).toBe(true);
		expect(center.status).toBe('offline');
		expect(clock.delays()).toEqual([RETRY_DELAYS_MS[0]]);

		clock.runAll();
		await flush();

		expect(fetch).toHaveBeenCalledTimes(2);
		expect(sources).toHaveLength(2);
		expect(last().url).toBe(`${TICKET.url}?ticket=abc&after=b`);

		// Se vuelve a caer sin haber abierto: la espera crece.
		last().fail();
		expect(clock.delays()).toEqual([RETRY_DELAYS_MS[1]]);

		// Al abrir, la cuenta de intentos vuelve a cero.
		clock.runAll();
		await flush();
		last().open();
		last().fail();
		expect(clock.delays()).toEqual([RETRY_DELAYS_MS[0]]);
	});

	it('si el ticket falla, reintenta sin abrir nada', async () => {
		const { center, sources, clock } = setup({ ticketOk: false });

		center.start();
		await flush();

		expect(sources).toHaveLength(0);
		expect(center.status).toBe('offline');
		expect(clock.delays()).toEqual([RETRY_DELAYS_MS[0]]);
	});

	it('stop cierra la conexión y cancela los reintentos', async () => {
		const { center, clock, last } = setup();

		center.start();
		await flush();
		last().fail();
		center.stop();

		expect(center.status).toBe('idle');
		expect(clock.pending.size).toBe(0);
	});

	it('un ticket que llega después de stop no abre nada', async () => {
		const { center, sources } = setup();

		center.start();
		center.stop();
		await flush();

		expect(sources).toHaveLength(0);
	});

	it('con la pestaña oculta un rato largo, cierra; al volver, reconecta', async () => {
		const { center, clock, sources, last } = setup();

		center.start();
		await flush();
		last().open();

		center.visibilityChanged(true);
		expect(clock.delays()).toEqual([HIDDEN_GRACE_MS]);

		clock.runAll();
		expect(last().closed).toBe(true);
		expect(center.status).toBe('idle');

		center.visibilityChanged(false);
		await flush();

		expect(sources).toHaveLength(2);
	});

	it('si vuelve antes del plazo, sigue con la misma conexión', async () => {
		const { center, clock, sources, last } = setup();

		center.start();
		await flush();
		last().open();

		center.visibilityChanged(true);
		center.visibilityChanged(false);
		await flush();

		expect(clock.pending.size).toBe(0);
		expect(sources).toHaveLength(1);
		expect(last().closed).toBe(false);
	});
});
