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
