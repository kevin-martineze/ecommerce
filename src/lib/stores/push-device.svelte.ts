// Tipos
import type { PushDeviceSubscription } from '$lib/domain/notifications';

/**
 * Los avisos push en ESTE navegador, para una bandeja (la de una tienda o la
 * de la consola).
 *
 * Se activan solo cuando la persona pulsa el botón: el permiso nunca se pide
 * al cargar. El navegador se suscribe acá y la suscripción llega al servidor
 * por form action (`pending`); la vista envía el formulario y avisa el
 * resultado con `settle`.
 *
 * Qué bandejas están activas en este navegador se anota en `localStorage`
 * (el endpoint, por bandeja): el navegador tiene una sola suscripción para
 * todo el sitio y no sabe para qué bandejas se pidió.
 */

export type PushState =
	| 'checking'
	/** El navegador no tiene push. */
	| 'unsupported'
	/** iPhone o iPad sin instalar: hay push solo desde la pantalla de inicio. */
	| 'needs-install'
	/** Bloqueó el permiso: solo se cambia en los ajustes del navegador. */
	| 'denied'
	| 'off'
	| 'on'
	| 'working';

/** Lo que el ViewModel usa del navegador. Las pruebas lo reemplazan. */
export interface PushPlatform {
	supported(): boolean;
	needsInstall(): boolean;
	permission(): NotificationPermission;
	requestPermission(): Promise<NotificationPermission>;
	/** La suscripción que ya tiene el navegador, si tiene. */
	current(): Promise<PushDeviceSubscription | null>;
	/** Registra el service worker y suscribe con esa llave (o reusa la que hay). */
	subscribe(publicKey: string): Promise<PushDeviceSubscription>;
	read(key: string): string | null;
	write(key: string, value: string | null): void;
}

/** Lo que se manda en el próximo envío del formulario. */
export type PushRequest =
	{ action: 'on'; subscription: PushDeviceSubscription } | { action: 'off'; endpoint: string };

export interface PushDeviceOptions {
	/** La llave VAPID de la API. Null: la API no manda push. */
	publicKey: string | null;
	/** La bandeja: `store:<id>` o `platform`. */
	scope: string;
	platform: PushPlatform;
}

export class PushDevice {
	state = $state<PushState>('checking');
	/** Lo que hay que enviar al servidor. Null fuera de un envío. */
	pending = $state<PushRequest | null>(null);
	/** Por qué no se pudo, para mostrar junto al botón. */
	problem = $state<string | null>(null);

	private readonly key: string;

	constructor(private readonly options: PushDeviceOptions) {
		this.key = `globerce:push:${options.scope}`;
	}

	/** Mira qué hay en este navegador. Se llama una vez, ya montado. */
	async check(): Promise<void> {
		const { platform } = this.options;

		if (!platform.supported()) {
			this.state = platform.needsInstall() ? 'needs-install' : 'unsupported';

			return;
		}

		if (!this.options.publicKey) {
			this.state = 'unsupported';

			return;
		}

		if (platform.permission() === 'denied') {
			this.state = 'denied';

			return;
		}

		const current = await this.currentSafely();
		const saved = platform.read(this.key);

		this.state =
			platform.permission() === 'granted' && current && current.endpoint === saved ? 'on' : 'off';
	}

	/** Pide permiso, suscribe y deja listo el envío. Al pulsar, nunca antes. */
	async enable(): Promise<boolean> {
		const { platform, publicKey } = this.options;

		if (!publicKey || this.state === 'working') return false;

		this.problem = null;
		this.state = 'working';

		const permission = await platform.requestPermission();

		if (permission !== 'granted') {
			this.state = permission === 'denied' ? 'denied' : 'off';

			return false;
		}

		try {
			const subscription = await platform.subscribe(publicKey);

			this.pending = { action: 'on', subscription };

			return true;
		} catch {
			this.problem = 'Este navegador no se pudo suscribir. Inténtalo otra vez.';
			this.state = 'off';

			return false;
		}
	}

	/** Deja listo el envío para dejar de recibir en esta bandeja. */
	async disable(): Promise<boolean> {
		if (this.state === 'working') return false;

		const current = await this.currentSafely();
		const endpoint = current?.endpoint ?? this.options.platform.read(this.key);

		this.problem = null;

		if (!endpoint) {
			this.state = 'off';

			return false;
		}

		this.state = 'working';
		this.pending = { action: 'off', endpoint };

		return true;
	}

	/** El servidor respondió. Solo si salió bien cambia lo anotado. */
	settle(ok: boolean): void {
		const request = this.pending;

		this.pending = null;

		if (!request) return;

		if (!ok) {
			this.state = request.action === 'on' ? 'off' : 'on';

			return;
		}

		if (request.action === 'on') {
			this.options.platform.write(this.key, request.subscription.endpoint);
			this.state = 'on';
		} else {
			this.options.platform.write(this.key, null);
			this.state = 'off';
		}
	}

	private async currentSafely(): Promise<PushDeviceSubscription | null> {
		try {
			return await this.options.platform.current();
		} catch {
			return null;
		}
	}
}
