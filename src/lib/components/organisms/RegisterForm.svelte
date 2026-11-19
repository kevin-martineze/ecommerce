<script lang="ts">
	// Tipos
	import type { Plan } from '$lib/domain/account';
	import type { FieldErrors } from '$lib/utils/form';

	// Svelte
	import { onMount, tick, untrack } from 'svelte';

	// Iconos
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	// App
	import { enhance } from '$app/forms';

	// Componentes
	import { Button } from '$lib/components/atoms/button';
	import PasswordField from '$lib/components/molecules/PasswordField.svelte';
	import PhoneField from '$lib/components/molecules/PhoneField.svelte';
	import PlanOption from '$lib/components/molecules/PlanOption.svelte';
	import Stepper from '$lib/components/molecules/Stepper.svelte';
	import TextField from '$lib/components/molecules/TextField.svelte';

	// Dominio
	import { MOCKUP_STORE } from '$lib/config/mockup';
	import { TRIAL_DAYS } from '$lib/domain/account';
	import { joinPhone, splitPhone } from '$lib/domain/phone';
	import {
		googleRegisterSchema,
		PASSWORD_MIN,
		registerSchema,
		storeFieldsSchema
	} from '$lib/schemas/account';

	// Utilidades
	import { fieldErrors } from '$lib/utils/form';
	import { formatMoney } from '$lib/utils/money';
	import { slugify } from '$lib/utils/slug';

	/**
	 * Abrir una tienda: el plan, la tienda y la cuenta de su dueña.
	 *
	 * Valida con el MISMO esquema que la action del servidor, así que lo que se
	 * ve al escribir es exactamente lo que va a aceptar la API. La validación
	 * del navegador es comodidad, no seguridad: el servidor vuelve a validarlo
	 * todo, y sin JavaScript el formulario funciona igual.
	 *
	 * Los pasos son una capa encima, no una condición: los tres bloques SIEMPRE
	 * se renderizan y solo se ocultan con `hidden` una vez hidratado. Si se
	 * pintaran con `{#if}`, los campos del paso que no se ve no viajarían en el
	 * envío, y sin JavaScript no habría formulario en absoluto.
	 */
	type Campo =
		'storeName' | 'storeSlug' | 'whatsappPhone' | 'fullName' | 'email' | 'password' | 'confirm';

	interface Props {
		/** Con sesión se crea otra tienda para esa cuenta: no se piden sus datos. */
		signedIn: boolean;
		/**
		 * Terminar un registro empezado con Google: la cuenta ya la dio Google
		 * (nombre y correo de solo lectura) y no lleva contraseña.
		 */
		google?: { email: string; fullName: string | null } | null;
		/** Lo que va detrás de la dirección, p. ej. `.globerce.store`. */
		addressSuffix: string | null;
		plans: Plan[];
		selectedPlan: string | undefined;
		/** Con qué tokenizar la tarjeta. Sin pasarela no se pide ninguna. */
		/** Lo que devolvió la action: mensaje general, errores por campo y lo tecleado. */
		result: {
			error?: string;
			errors?: FieldErrors;
			values?: Record<string, string | undefined>;
		} | null;
	}

	let { signedIn, google = null, addressSuffix, plans, selectedPlan, result }: Props = $props();

	/** Lo tecleado vuelve del servidor para no perderlo cuando algo falla. */
	const sent = untrack(() => result?.values ?? {});

	// Lo que se guarda es un solo número con indicativo; el formulario lo
	// muestra partido en dos, así que al volver del servidor se reparte.
	const phone = untrack(() => splitPhone(sent.whatsappPhone ?? ''));

	let storeName = $state(sent.storeName ?? '');
	let whatsappCountry = $state(phone.code);
	let whatsappPhone = $state(phone.number);
	let fullName = $state(sent.fullName ?? '');
	let email = $state(sent.email ?? '');
	let password = $state('');
	let confirm = $state('');
	let chosenPlan = $state<string | null>(sent.planCode ?? null);

	/** Mientras la dueña no la toque, la dirección sigue al nombre. */
	let slugEdited = $state(Boolean(sent.storeSlug));
	let customSlug = $state(sent.storeSlug ?? '');

	const storeSlug = $derived(slugEdited ? customSlug : slugify(storeName).slice(0, 40));
	const planCode = $derived(chosenPlan ?? selectedPlan ?? '');

	/**
	 * La tarjeta vive solo acá y no sale de este navegador: al enviar se cambia
	 * por un token contra la pasarela y los campos se borran del formulario.
	 */

	let submitting = $state(false);
	let clientErrors = $state<FieldErrors>({});
	/** Campos que se volvieron a tocar: su error del servidor ya no aplica. */
	let touched = $state<Record<string, boolean>>({});

	let formElement = $state<HTMLFormElement | null>(null);

	/**
	 * Sin JavaScript no hay pasos: todo se ve de una vez y se envía de una vez.
	 * El servidor renderiza así, y solo al hidratar se reparte en pasos.
	 */
	let hydrated = $state(false);
	let currentStep = $state(0);

	// `onMount` y no `$effect`: no se reacciona a nada, se constata que hay
	// JavaScript corriendo.
	onMount(() => {
		hydrated = true;
	});

	const values = $derived({
		storeName,
		storeSlug,
		// El esquema valida el número completo, que es lo que viaja a la API.
		whatsappPhone: joinPhone(whatsappCountry, whatsappPhone),
		fullName,
		email,
		password,
		confirm
	});

	const errors = $derived.by(() => {
		const merged: FieldErrors = {};

		for (const [field, message] of Object.entries(result?.errors ?? {})) {
			if (!touched[field]) merged[field] = message;
		}

		return { ...merged, ...clientErrors };
	});

	const schema = $derived(
		signedIn ? storeFieldsSchema : google ? googleRegisterSchema(!google.fullName) : registerSchema
	);
	const shape = registerSchema.innerType().shape;

	/**
	 * Los pasos se arman con los que de verdad se piden: con sesión no se pide
	 * la cuenta, y sin precios no hay plan que elegir.
	 */
	const steps = $derived(
		[
			plans.length > 0 ? { id: 'plan', title: 'Plan', fields: [] as Campo[] } : null,
			{
				id: 'tienda',
				title: 'Tu tienda',
				fields: ['storeName', 'whatsappPhone', 'storeSlug'] as Campo[]
			},
			signedIn
				? null
				: {
						id: 'cuenta',
						title: 'Tu cuenta',
						// Con Google solo se escribe el nombre, y solo si Google no lo
						// dio: el paso muestra con qué cuenta se va a entrar.
						fields: google
							? google.fullName
								? []
								: (['fullName'] as Campo[])
							: (['fullName', 'email', 'password', 'confirm'] as Campo[])
					}
			// No hay paso de pago: los primeros días son gratis, y la tarjeta se
			// pone después desde el panel, en Plan.
		].filter((step) => step !== null)
	);

	const titles = $derived(steps.map((step) => step.title));
	const enElUltimo = $derived(currentStep >= steps.length - 1);

	/** Se validan solo los campos que se piden: con sesión, los de la cuenta ni se pintan. */
	const fields = $derived(steps.flatMap((step) => step.fields));

	/** Antes de hidratar se ve todo; después, solo el paso en curso. */
	function hidden(id: string): boolean {
		return hydrated && steps[currentStep]?.id !== id;
	}

	function setError(field: string, message: string | null) {
		const next = { ...clientErrors };

		if (message) next[field] = message;
		else delete next[field];

		clientErrors = next;
	}

	/** Revisa un campo al salir de él: corregir en caliente es más barato que al final. */
	function check(field: Campo) {
		if (field === 'confirm') {
			setError(
				'confirm',
				password && confirm !== password ? 'Las contraseñas no coinciden.' : null
			);
			return;
		}

		const result = shape[field].safeParse(values[field]);

		setError(field, result.success ? null : (result.error.issues.at(0)?.message ?? null));
	}

	/** Mientras se escribe no se regaña: solo se borra lo que ya no aplica. */
	function clear(field: string) {
		touched = { ...touched, [field]: true };
		if (clientErrors[field]) setError(field, null);
	}

	/** El paso donde vive un campo, para no dejar un error en una pantalla que no se ve. */
	function stepOf(fieldName: string): number {
		return steps.findIndex((step) => step.fields.some((own) => own === fieldName));
	}

	async function focusOn(fieldName: string) {
		await tick();
		formElement?.querySelector<HTMLInputElement>(`[name="${fieldName}"]`)?.focus();
	}

	/**
	 * Lleva el foco —y la vista— al primer campo que falla, esté en el paso que
	 * esté. Un error en un paso oculto es un formulario que no se deja enviar
	 * sin decir por qué.
	 */
	async function irAlPrimerError(failures: FieldErrors) {
		const firstOne = fields.find((fieldName) => fieldName in failures);

		if (!firstOne) return;

		const index = stepOf(firstOne);

		if (index >= 0) currentStep = index;

		await focusOn(firstOne);
	}

	/** Avanza solo si lo de este paso está bien: así el error se corrige donde se escribió. */
	function nextStep() {
		const actual = steps[currentStep];

		if (!actual) return;

		for (const fieldName of actual.fields) check(fieldName);

		const failure = actual.fields.find((fieldName) => fieldName in clientErrors);

		if (failure) {
			void focusOn(failure);
			return;
		}

		currentStep = Math.min(currentStep + 1, steps.length - 1);
	}
</script>

<!--
	`novalidate` apaga los avisos del navegador a propósito: los mensajes salen
	del mismo esquema que valida el servidor, en español y bajo cada campo, y no
	de una burbuja que dice "Completa este campo" y tapa lo que sigue. Sin
	JavaScript no se pierde nada: el que valida de verdad es el servidor.
-->
<form
	method="POST"
	novalidate
	bind:this={formElement}
	class="space-y-8"
	use:enhance={async ({ cancel }) => {
		// Enter dentro de un campo envía el formulario. Si aún faltan pasos, eso
		// no es "quiero registrarme": es "quiero seguir".
		if (hydrated && !enElUltimo) {
			cancel();
			nextStep();

			return;
		}

		const parsed = schema.safeParse(values);

		if (!parsed.success) {
			const failures = fieldErrors(parsed.error);

			clientErrors = failures;
			cancel();
			void irAlPrimerError(failures);

			return;
		}

		submitting = true;

		return async ({ update }) => {
			await update({ reset: false });
			submitting = false;

			// Lo que solo sabe el servidor —una dirección ya tomada, un correo
			// repetido— llega después del envío, y puede caer en un paso atrás.
			const returned = result?.errors;

			if (returned) await irAlPrimerError(returned);
		};
	}}
>
	{#if hydrated && steps.length > 1}
		<Stepper steps={titles} actual={currentStep} ongo={(index) => (currentStep = index)} />
	{/if}

	{#if !hydrated}
		<p class="text-muted-foreground text-xs">Todos los campos son obligatorios.</p>
	{/if}

	{#if plans.length > 0}
		<fieldset class="space-y-4" hidden={hidden('plan')}>
			<legend class="mb-3 text-sm font-medium">Elige tu plan</legend>

			<div class="grid gap-3 sm:grid-cols-3">
				{#each plans as plan, index (plan.code)}
					<PlanOption
						{plan}
						isSelected={planCode === plan.code}
						recommended={index === plans.length - 1}
						onselect={() => (chosenPlan = plan.code)}
					/>
				{/each}
			</div>

			<p class="text-muted-foreground text-xs">
				{#if signedIn}
					Cada tienda tiene su propio plan. Los primeros {TRIAL_DAYS} días son gratis.
				{:else}
					Los primeros {TRIAL_DAYS} días son gratis y no se te cobra nada hoy. Puedes cambiar de plan
					cuando quieras desde tu panel.
				{/if}
			</p>
		</fieldset>
	{/if}

	<fieldset class="space-y-4" hidden={hidden('tienda')}>
		<legend class="mb-3 text-sm font-medium">Tu tienda</legend>

		<div class="grid gap-4 sm:grid-cols-2">
			<TextField
				name="storeName"
				label="Nombre de la tienda"
				bind:value={storeName}
				error={errors.storeName}
				required
				maxlength={80}
				placeholder={MOCKUP_STORE.name}
				oninput={() => clear('storeName')}
				onblur={() => check('storeName')}
			/>

			<PhoneField
				name="whatsappPhone"
				label="WhatsApp de ventas"
				bind:value={whatsappPhone}
				bind:country={whatsappCountry}
				error={errors.whatsappPhone}
				hint="Aquí llegan los pedidos."
				required
				placeholder="300 123 4567"
				oninput={() => clear('whatsappPhone')}
				onblur={() => check('whatsappPhone')}
			/>
		</div>

		<TextField
			name="storeSlug"
			label="Dirección de tu tienda"
			value={storeSlug}
			error={errors.storeSlug}
			hint="Minúsculas, números y guiones. No se puede cambiar después."
			required
			minlength={3}
			maxlength={40}
			suffix={addressSuffix ?? undefined}
			oninput={(event) => {
				slugEdited = true;
				customSlug = event.currentTarget.value;
				clear('storeSlug');
			}}
			onblur={() => check('storeSlug')}
		/>
	</fieldset>

	{#if !signedIn && google}
		<fieldset class="space-y-4" hidden={hidden('cuenta')}>
			<legend class="mb-3 text-sm font-medium">Tu cuenta</legend>

			<div class="grid gap-4 sm:grid-cols-2">
				{#if google.fullName}
					<TextField
						name="fullName"
						label="Tu nombre y apellido"
						value={google.fullName}
						readonly
						autocomplete="name"
					/>
				{:else}
					<!-- Google no dio nombre: se pide, igual que en el registro con correo. -->
					<TextField
						name="fullName"
						label="Tu nombre y apellido"
						bind:value={fullName}
						error={errors.fullName}
						required
						autocomplete="name"
						placeholder="María Restrepo"
						oninput={() => clear('fullName')}
						onblur={() => check('fullName')}
					/>
				{/if}

				<TextField
					name="email"
					label="Correo"
					type="email"
					value={google.email}
					hint="Entras al panel con tu cuenta de Google."
					readonly
					autocomplete="username"
				/>
			</div>
		</fieldset>
	{:else if !signedIn}
		<fieldset class="space-y-4" hidden={hidden('cuenta')}>
			<legend class="mb-3 text-sm font-medium">Tu cuenta</legend>

			<div class="grid gap-4 sm:grid-cols-2">
				<TextField
					name="fullName"
					label="Tu nombre y apellido"
					bind:value={fullName}
					error={errors.fullName}
					required
					autocomplete="name"
					placeholder="María Restrepo"
					oninput={() => clear('fullName')}
					onblur={() => check('fullName')}
				/>

				<TextField
					name="email"
					label="Correo"
					type="email"
					bind:value={email}
					error={errors.email}
					hint="Con este entras al panel."
					required
					autocomplete="username"
					placeholder="maria@correo.com"
					oninput={() => clear('email')}
					onblur={() => check('email')}
				/>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<PasswordField
					name="password"
					label="Contraseña"
					bind:value={password}
					error={errors.password}
					hint={`Mínimo ${PASSWORD_MIN} caracteres. Una frase es más fácil de recordar.`}
					required
					minlength={PASSWORD_MIN}
					oninput={() => clear('password')}
					onblur={() => check('password')}
				/>

				<PasswordField
					name="confirm"
					label="Repite la contraseña"
					bind:value={confirm}
					error={errors.confirm}
					required
					oninput={() => clear('confirm')}
					onblur={() => check('confirm')}
				/>
			</div>
		</fieldset>
	{/if}

	{#if result?.error}
		<p class="text-destructive text-sm">{result.error}</p>
	{/if}

	<div class="space-y-3">
		{#if hydrated && plans.length > 0 && steps[currentStep]?.id !== 'plan'}
			<!-- Lo que se está comprando no desaparece al pasar de paso: decidir el
			     plan y luego no verlo más es la forma fácil de dudar al final. -->
			{@const chosen = plans.find((plan) => plan.code === planCode)}
			{#if chosen}
				<p class="text-muted-foreground text-xs">
					Plan {chosen.name} · {formatMoney(chosen.price_cop)} / mes, gratis los primeros {TRIAL_DAYS}
					días.
				</p>
			{/if}
		{/if}

		<!-- La acción va a la derecha y del ancho de su texto: un botón que cruza
		     toda la pantalla pesa lo mismo que el formulario entero, y avanzar un
		     paso no es la decisión más importante de la página. `Atrás` se empuja
		     al otro extremo para que no compita con ella. -->
		<div class="flex items-center justify-end gap-3">
			{#if hydrated && currentStep > 0}
				<Button type="button" variant="outline" class="mr-auto" onclick={() => (currentStep -= 1)}>
					<ArrowLeft class="size-4" />
					Atrás
				</Button>
			{/if}

			{#if hydrated && !enElUltimo}
				<Button type="button" onclick={nextStep}>Continuar</Button>
			{:else}
				<Button type="submit" disabled={submitting}>
					{submitting ? 'Creando tu tienda…' : 'Crear mi tienda'}
				</Button>
			{/if}
		</div>
	</div>
</form>
