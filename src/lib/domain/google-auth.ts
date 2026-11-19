/**
 * Avisos de "Entrar con Google" en el login y el registro.
 *
 * El callback devuelve a la página de origen con `?error=<código>`: en la URL
 * viaja solo el código, nunca el texto, para que nadie pueda armar un enlace
 * que pinte un mensaje inventado en nuestra página de acceso.
 */

export const GOOGLE_NOTICE_CODES = {
	/** Se canceló en Google, el intento venció o la API no pudo canjear el código. */
	failed: 'google',
	/** Google no confirma que el correo sea de quien entra. */
	emailUnverified: 'google_email_unverified',
	/** La cuenta no tiene contraseña: entra con Google. Lo responde `POST /auth/login`. */
	useGoogle: 'use_google',
	/** Se llegó a `/signup?with=google` sin un intento vivo (venció o ya se usó). */
	signupExpired: 'google_signup_expired',
	/** Aceptar la invitación con una cuenta de Google distinta del correo invitado. */
	invitationEmailMismatch: 'invitation_email_mismatch',
	/** Esa cuenta de Google ya está vinculada a otra cuenta de Globerce. */
	googleAccountLinkedElsewhere: 'google_account_linked_elsewhere',
	/** La invitación venció, ya se usó o no existe. Lo responde la API con 400 o 404. */
	invitationInvalid: 'invitation_invalid'
} as const;

export type GoogleNoticeCode = (typeof GOOGLE_NOTICE_CODES)[keyof typeof GOOGLE_NOTICE_CODES];

export const GOOGLE_NOTICES: Record<GoogleNoticeCode, string> = {
	[GOOGLE_NOTICE_CODES.failed]: 'No pudimos entrar con Google. Intenta de nuevo.',
	[GOOGLE_NOTICE_CODES.emailUnverified]:
		'Google no ha confirmado ese correo. Confírmalo en tu cuenta de Google o entra con tu contraseña.',
	[GOOGLE_NOTICE_CODES.useGoogle]: 'Esta cuenta entra con Google. Usa «Continuar con Google».',
	[GOOGLE_NOTICE_CODES.signupExpired]:
		'Pasó mucho tiempo desde que elegiste tu cuenta de Google. Vuelve a empezar.',
	[GOOGLE_NOTICE_CODES.invitationEmailMismatch]:
		'Esa cuenta de Google no es la del correo que te invitó. Elige la cuenta de ese correo.',
	[GOOGLE_NOTICE_CODES.googleAccountLinkedElsewhere]:
		'Esa cuenta de Google ya está conectada a otra cuenta de Globerce. Usa otra.',
	[GOOGLE_NOTICE_CODES.invitationInvalid]:
		'Esta invitación ya no es válida: venció o ya se usó. Pídele a la dueña de la tienda que te invite de nuevo.'
};

/** El texto de un aviso de Google, o null si el código no es de los nuestros. */
export function googleNotice(code: string | null | undefined): string | null {
	const known = Object.values(GOOGLE_NOTICE_CODES).find((candidate) => candidate === code);

	return known ? GOOGLE_NOTICES[known] : null;
}
