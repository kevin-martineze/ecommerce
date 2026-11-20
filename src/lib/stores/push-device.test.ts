// Tipos
import type { PushDeviceSubscription } from '$lib/domain/notifications';

// Librerías
import { describe, expect, it, vi } from 'vitest';

// Estado
import { PushDevice, type PushPlatform } from '$lib/stores/push-device.svelte';

const SUBSCRIPTION: PushDeviceSubscription = {
	endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
	keys: { p256dh: 'BKey', auth: 'secret' }
};

const KEY = 'globerce:push:store:1';

function fakePlatform(overrides: Partial<PushPlatform> = {}) {
	const storage = new Map<string, string>();
	let permission: NotificationPermission = 'default';
	let current: PushDeviceSubscription | null = null;

	const platform: PushPlatform = {
		supported: () => true,
		needsInstall: () => false,
		permission: () => permission,
		requestPermission: vi.fn(async () => {
			permission = 'granted';

			return permission;
		}),
		current: async () => current,
		subscribe: vi.fn(async () => {
			current = SUBSCRIPTION;

			return SUBSCRIPTION;
		}),
		read: (key) => storage.get(key) ?? null,
		write: (key, value) => {
			if (value === null) storage.delete(key);
			else storage.set(key, value);
		},
		...overrides
	};

	return {
		platform,
		storage,
		setPermission: (next: NotificationPermission) => {
			permission = next;
		},
		setCurrent: (next: PushDeviceSubscription | null) => {
			current = next;
		}
	};
}

function device(platform: PushPlatform, publicKey: string | null = 'BPublica') {
	return new PushDevice({ publicKey, scope: 'store:1', platform });
}

describe('PushDevice', () => {
	it('sin push en el navegador, lo dice; en iPhone sin instalar, pide instalar', async () => {
		const plain = device(fakePlatform({ supported: () => false }).platform);
		const iphone = device(
			fakePlatform({ supported: () => false, needsInstall: () => true }).platform
		);

		await plain.check();
		await iphone.check();

		expect(plain.state).toBe('unsupported');
		expect(iphone.state).toBe('needs-install');
	});

	it('sin llave de la API, no ofrece activar', async () => {
		const push = device(fakePlatform().platform, null);

		await push.check();

		expect(push.state).toBe('unsupported');
	});

	it('con el permiso bloqueado, lo dice', async () => {
		const fake = fakePlatform();

		fake.setPermission('denied');

		const push = device(fake.platform);

		await push.check();

		expect(push.state).toBe('denied');
	});

	it('al cargar no pide permiso', async () => {
		const fake = fakePlatform();
		const push = device(fake.platform);

		await push.check();

		expect(push.state).toBe('off');
		expect(fake.platform.requestPermission).not.toHaveBeenCalled();
	});

	it('activar pide permiso, suscribe y deja el envío listo; al confirmar queda activo', async () => {
		const fake = fakePlatform();
		const push = device(fake.platform);

		await push.check();

		expect(await push.enable()).toBe(true);
		expect(push.state).toBe('working');
		expect(push.pending).toEqual({ action: 'on', subscription: SUBSCRIPTION });
		expect(fake.platform.subscribe).toHaveBeenCalledWith('BPublica');

		push.settle(true);

		expect(push.state).toBe('on');
		expect(push.pending).toBeNull();
		expect(fake.storage.get(KEY)).toBe(SUBSCRIPTION.endpoint);
	});

	it('si el servidor rechaza, vuelve a apagado sin anotar nada', async () => {
		const fake = fakePlatform();
		const push = device(fake.platform);

		await push.check();
		await push.enable();
		push.settle(false);

		expect(push.state).toBe('off');
		expect(fake.storage.has(KEY)).toBe(false);
	});

	it('si niega el permiso, no suscribe', async () => {
		const fake = fakePlatform({ requestPermission: async () => 'denied' });
		const push = device(fake.platform);

		await push.check();

		expect(await push.enable()).toBe(false);
		expect(push.state).toBe('denied');
		expect(fake.platform.subscribe).not.toHaveBeenCalled();
	});

	it('si el navegador no se deja suscribir, lo explica', async () => {
		const fake = fakePlatform({
			subscribe: async () => {
				throw new Error('AbortError');
			}
		});
		const push = device(fake.platform);

		await push.check();

		expect(await push.enable()).toBe(false);
		expect(push.state).toBe('off');
		expect(push.problem).toMatch(/no se pudo suscribir/);
	});

	it('está activo solo si la suscripción es la anotada para esta bandeja', async () => {
		const fake = fakePlatform();

		fake.setPermission('granted');
		fake.setCurrent(SUBSCRIPTION);

		const other = device(fake.platform);

		await other.check();
		expect(other.state).toBe('off');

		fake.storage.set(KEY, SUBSCRIPTION.endpoint);

		const mine = device(fake.platform);

		await mine.check();
		expect(mine.state).toBe('on');
	});

	it('desactivar manda el endpoint y, al confirmar, borra lo anotado', async () => {
		const fake = fakePlatform();

		fake.setPermission('granted');
		fake.setCurrent(SUBSCRIPTION);
		fake.storage.set(KEY, SUBSCRIPTION.endpoint);

		const push = device(fake.platform);

		await push.check();

		expect(await push.disable()).toBe(true);
		expect(push.pending).toEqual({ action: 'off', endpoint: SUBSCRIPTION.endpoint });

		push.settle(true);

		expect(push.state).toBe('off');
		expect(fake.storage.has(KEY)).toBe(false);
	});
});
