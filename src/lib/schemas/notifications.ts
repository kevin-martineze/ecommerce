// Librerías
import { z } from 'zod';

/**
 * Tocar un aviso: se marca leído y se va a su detalle. El destino llega del
 * formulario, así que el servidor lo pasa por `safeRedirectTarget` antes de
 * usarlo.
 */
export const openNotificationSchema = z.object({
	id: z.string().trim().min(1, 'Esa notificación no existe.'),
	href: z.string().trim().max(500).default('')
});

/**
 * Activar los avisos push en este navegador: lo que da
 * `PushSubscription.toJSON()`, en campos planos. La API vuelve a validar que el
 * endpoint sea de un servicio push conocido.
 */
export const pushOnSchema = z
	.object({
		endpoint: z.string().trim().url('Este navegador no se pudo suscribir.').max(1000),
		p256dh: z.string().trim().min(1).max(200),
		auth: z.string().trim().min(1).max(100)
	})
	.transform(({ endpoint, p256dh, auth }) => ({ endpoint, keys: { p256dh, auth } }));

export const pushOffSchema = z.object({
	endpoint: z.string().trim().min(1, 'Este navegador no tiene avisos activos.').max(1000)
});
