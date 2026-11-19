// Librerías
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

/**
 * Sellado de la sesión del panel dentro de una cookie.
 *
 * La API entrega los tokens en el cuerpo de la respuesta y quien los guarda es
 * este servidor, en una cookie httpOnly de su propio dominio. Se CIFRAN y no
 * solo se firman: una firma impide falsificarlos, pero los dejaría legibles
 * para cualquiera que vea la cookie —una extensión del navegador, el log de un
 * proxy—. Cifrados, el navegador guarda un valor opaco.
 *
 * AES-256-GCM cifra y autentica a la vez: una cookie alterada no descifra a
 * basura, falla. No hace falta una firma aparte.
 *
 * Son funciones puras, sin `$env` ni cookies, para probarlas sin SvelteKit.
 * `seal` / `unseal` sirven también para otras cookies cifradas (el intento
 * de entrar con Google, ver `google-oauth.ts`).
 */

export const adminSessionSchema = z.object({
	accessToken: z.string().min(1),
	refreshToken: z.string().min(1),
	/** Epoch en milisegundos en que vence el access token. */
	accessExpiresAt: z.number().int(),
	userId: z.string(),
	email: z.string(),
	/**
	 * Tienda activa. Null solo para una cuenta que administra la plataforma sin
	 * pertenecer a ninguna tienda: entra a `/platform`, nunca al panel.
	 */
	storeId: z.string().nullable()
});

export type AdminSession = z.infer<typeof adminSessionSchema>;

/** Se refresca con este margen antes del vencimiento, para no mandar a la API un token que muere en vuelo. */
export const REFRESH_MARGIN_MS = 60_000;

const IV_BYTES = 12;
const TAG_BYTES = 16;

/** Hashear el secreto da exactamente los 32 bytes que pide AES-256, sea cual sea su largo. */
function keyFrom(secret: string): Buffer {
	return createHash('sha256').update(secret).digest();
}

/**
 * Contexto que se autentica junto con el contenido (AAD de GCM). Con él, una
 * cookie sellada para un propósito no abre como otro aunque compartan
 * secreto: la de un intento con Google no sirve de sesión, ni al revés. La
 * sesión del panel no lleva, para que las cookies ya emitidas sigan abriendo.
 */
export interface SealOptions {
	purpose?: string;
}

/** Sella cualquier valor serializable a JSON. Es la base de las cookies cifradas del servidor. */
export function seal(payload: unknown, secret: string, options: SealOptions = {}): string {
	const iv = randomBytes(IV_BYTES);
	const cipher = createCipheriv('aes-256-gcm', keyFrom(secret), iv);

	if (options.purpose) cipher.setAAD(Buffer.from(options.purpose, 'utf8'));

	const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);

	return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

/**
 * El valor sellado, leído con su esquema, o null si no es de este servidor,
 * fue alterado, es de otro propósito o tiene otra forma.
 */
export function unseal<T>(
	value: string,
	secret: string,
	schema: z.ZodType<T, z.ZodTypeDef, unknown>,
	options: SealOptions = {}
): T | null {
	try {
		const raw = Buffer.from(value, 'base64url');

		if (raw.length <= IV_BYTES + TAG_BYTES) return null;

		const decipher = createDecipheriv('aes-256-gcm', keyFrom(secret), raw.subarray(0, IV_BYTES));
		decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));

		if (options.purpose) decipher.setAAD(Buffer.from(options.purpose, 'utf8'));

		const json = Buffer.concat([
			decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)),
			decipher.final()
		]).toString('utf8');

		const decoded: unknown = JSON.parse(json);
		const parsed = schema.safeParse(decoded);

		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

export function sealSession(session: AdminSession, secret: string): string {
	return seal(session, secret);
}

/** La sesión, o null si la cookie no es de este servidor, fue alterada o tiene otra forma. */
export function unsealSession(value: string, secret: string): AdminSession | null {
	return unseal(value, secret, adminSessionSchema);
}

export function needsRefresh(session: AdminSession, now: number): boolean {
	return session.accessExpiresAt - now <= REFRESH_MARGIN_MS;
}
