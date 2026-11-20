<!--
@component
Activar o apagar las notificaciones push en ESTE dispositivo, para una
bandeja. El permiso se pide solo al pulsar el botón. La suscripción llega al
servidor por las form actions `?/pushOn` y `?/pushOff` de la página.
-->
<script lang="ts">
	// Svelte
	import { tick, untrack } from 'svelte';

	// Iconos
	import Smartphone from '@lucide/svelte/icons/smartphone';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { Button } from '$lib/components/atoms/button';

	// Estado
	import { PushDevice } from '$lib/stores/push-device.svelte';
	import { browserPushPlatform } from '$lib/stores/push-platform';

	interface Props {
		/** La llave VAPID de la API. Null: no hay push y no se muestra nada. */
		publicKey: string | null;
		/** La bandeja: `store:<id>` o `platform`. */
		scope: string;
	}

	let { publicKey, scope }: Props = $props();

	const push = new PushDevice({
		publicKey: untrack(() => publicKey),
		scope: untrack(() => scope),
		platform: browserPushPlatform()
	});

	let onForm = $state<HTMLFormElement | null>(null);
	let offForm = $state<HTMLFormElement | null>(null);

	const subscription = $derived(push.pending?.action === 'on' ? push.pending.subscription : null);
	const offEndpoint = $derived(push.pending?.action === 'off' ? push.pending.endpoint : '');

	// Leer el navegador es un efecto real: solo existe ya montado.
	$effect(() => {
		void push.check();
	});

	async function turnOn() {
		if (await push.enable()) {
			await tick();
			onForm?.requestSubmit();
		}
	}

	async function turnOff() {
		if (await push.disable()) {
			await tick();
			offForm?.requestSubmit();
		}
	}

	const settle = () => {
		return async ({
			result,
			update
		}: {
			result: { type: string };
			update: (options?: { reset?: boolean }) => Promise<void>;
		}) => {
			push.settle(result.type === 'success');
			await update({ reset: false });
		};
	};
</script>

{#if publicKey && push.state !== 'checking'}
	<div class="border-border mb-6 flex flex-wrap items-center gap-3 rounded-md border px-4 py-3">
		<Smartphone class="text-muted-foreground size-5 flex-none" />
		<p class="min-w-0 flex-1 text-sm">
			{#if push.state === 'on'}
				Este dispositivo recibe tus notificaciones, aunque tengas el panel cerrado.
			{:else if push.state === 'denied'}
				Bloqueaste las notificaciones de este sitio. Actívalas en los ajustes del navegador.
			{:else if push.state === 'needs-install'}
				Para recibir notificaciones en iPhone, agrega Globerce a tu pantalla de inicio: toca
				Compartir y luego «Agregar a inicio».
			{:else if push.state === 'unsupported'}
				Este navegador no puede recibir notificaciones con el panel cerrado.
			{:else}
				Recibe las notificaciones en este dispositivo, aunque tengas el panel cerrado.
			{/if}
			{#if push.problem}
				<span class="text-destructive block text-xs">{push.problem}</span>
			{/if}
		</p>

		{#if push.state === 'on' || (push.state === 'working' && push.pending?.action === 'off')}
			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={push.state === 'working'}
				onclick={turnOff}
			>
				Dejar de avisarme aquí
			</Button>
		{:else if push.state === 'off' || push.state === 'working'}
			<Button type="button" size="sm" disabled={push.state === 'working'} onclick={turnOn}>
				Avisarme en este dispositivo
			</Button>
		{/if}
	</div>

	<form bind:this={onForm} method="POST" action="?/pushOn" hidden use:enhance={settle}>
		<input type="hidden" name="endpoint" value={subscription?.endpoint ?? ''} />
		<input type="hidden" name="p256dh" value={subscription?.keys.p256dh ?? ''} />
		<input type="hidden" name="auth" value={subscription?.keys.auth ?? ''} />
	</form>
	<form bind:this={offForm} method="POST" action="?/pushOff" hidden use:enhance={settle}>
		<input type="hidden" name="endpoint" value={offEndpoint} />
	</form>
{/if}
