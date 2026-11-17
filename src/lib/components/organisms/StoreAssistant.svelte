<script lang="ts">
	// Iconos
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Send from '@lucide/svelte/icons/send';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import X from '@lucide/svelte/icons/x';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import { Input } from '$lib/components/atoms/input';

	// Utilidades
	import { cn } from '$lib/utils';
	import { buildWhatsAppUrl } from '$lib/utils/whatsapp';

	/**
	 * El chat de la tienda.
	 *
	 * Responde con el catálogo de ESTA tienda: quien contesta no sabe nada que
	 * no haya consultado. Cuando no sabe —o cuando la tienda agotó su cuota del
	 * mes— ofrece WhatsApp, que es como se cierra la venta igual.
	 *
	 * La conversación vive solo acá, en memoria: al cerrar la pestaña
	 * desaparece. No se guarda ni en el navegador ni en el servidor, porque es
	 * de quien está preguntando.
	 */
	interface Props {
		storeName: string;
		whatsappPhone: string;
	}

	let { storeName, whatsappPhone }: Props = $props();

	interface Turn {
		role: 'user' | 'assistant';
		content: string;
	}

	let isOpen = $state(false);
	let question = $state('');
	let waiting = $state(false);
	let offerWhatsapp = $state(false);
	let turns = $state<Turn[]>([]);
	let thread = $state<HTMLDivElement | null>(null);

	const greeting = $derived(
		`Hola, soy quien atiende ${storeName}. Pregúntame por variaciones, colores o envíos.`
	);

	async function send(event: SubmitEvent) {
		event.preventDefault();

		const text = question.trim();

		if (!text || waiting) return;

		turns = [...turns, { role: 'user', content: text }];
		question = '';
		waiting = true;
		offerWhatsapp = false;
		moveDown();

		try {
			const response = await fetch('/assistant', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ messages: turns })
			});

			const data: { reply: string; handoff: boolean } = await response.json();

			turns = [...turns, { role: 'assistant', content: data.reply }];
			offerWhatsapp = data.handoff;
		} catch {
			// La red se cayó: se dice, no se deja el chat mudo.
			turns = [
				...turns,
				{
					role: 'assistant',
					content: 'Me quedé sin conexión. Escríbenos por WhatsApp y te respondemos.'
				}
			];
			offerWhatsapp = true;
		} finally {
			waiting = false;
			moveDown();
		}
	}

	/** El último mensaje a la vista, que es el que importa. */
	function moveDown() {
		requestAnimationFrame(() => thread?.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' }));
	}

	const whatsappHref = $derived(
		buildWhatsAppUrl(whatsappPhone, `Hola, vengo de ${storeName} y tengo una pregunta.`)
	);
</script>

<div class="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
	{#if isOpen}
		<!-- La aurora va en un envoltorio SIN fondo: el resplandor vive detrás y
		     quien lleva el fondo es el panel de adentro. Al revés, el degradado
		     se ve por encima y tiñe la conversación. -->
		<div class="ai-aurora w-[min(22rem,calc(100vw-2rem))] rounded-lg">
			<div
				class="bg-background overflow-hidden rounded-lg shadow-2xl"
				role="dialog"
				aria-label="Chat de la tienda"
			>
				<div class="border-border flex items-center justify-between gap-2 border-b px-4 py-3">
					<p class="flex items-center gap-2 text-sm font-medium">
						<Sparkles class="size-4" />
						Pregúntale a {storeName}
					</p>
					<button
						type="button"
						class="text-muted-foreground hover:text-foreground"
						onclick={() => (isOpen = false)}
						aria-label="Cerrar el chat"
					>
						<X class="size-4" />
					</button>
				</div>

				<div bind:this={thread} class="max-h-[22rem] space-y-3 overflow-y-auto px-4 py-4">
					<p class="text-muted-foreground text-sm">{greeting}</p>

					{#each turns as turn, index (index)}
						<p
							class={cn(
								'w-fit max-w-[85%] rounded-lg px-3 py-2 text-sm',
								turn.role === 'user'
									? 'bg-primary text-primary-foreground ml-auto'
									: 'bg-muted text-foreground'
							)}
						>
							{turn.content}
						</p>
					{/each}

					{#if waiting}
						<p class="text-muted-foreground text-sm">Escribiendo…</p>
					{/if}

					{#if offerWhatsapp && !waiting}
						<a
							href={whatsappHref}
							target="_blank"
							rel="noopener"
							class="bg-whatsapp text-whatsapp-foreground inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
						>
							<MessageCircle class="size-4" />
							Seguir por WhatsApp
						</a>
					{/if}
				</div>

				<form onsubmit={send} class="border-border flex items-center gap-2 border-t p-3">
					<Input
						bind:value={question}
						maxlength={500}
						placeholder="¿Tienen variación M?"
						aria-label="Tu pregunta"
						disabled={waiting}
					/>
					<Button type="submit" size="icon" disabled={waiting || question.trim() === ''}>
						<Send class="size-4" />
						<span class="sr-only">Enviar</span>
					</Button>
				</form>
			</div>
		</div>
	{/if}

	<div class={cn('ai-aurora rounded-full', isOpen && 'hidden')}>
		<Button type="button" size="lg" class="rounded-full shadow-lg" onclick={() => (isOpen = true)}>
			<Sparkles class="mr-2 size-4" />
			Pregúntanos
		</Button>
	</div>
</div>
