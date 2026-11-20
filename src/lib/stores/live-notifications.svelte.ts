// Librerías
import { toast } from 'svelte-sonner';

// App
import { goto } from '$app/navigation';

// Estado
import { NotificationCenter } from '$lib/stores/notification-center.svelte';

// Dominio
import {
	isWarning,
	notificationHref,
	notificationText,
	type NotificationInbox
} from '$lib/domain/notifications';

interface LiveNotificationsOptions {
	/** La bandeja de la carga del layout. Un getter, para que siga a `data`. */
	inbox: () => NotificationInbox;
	/** Donde viven la bandeja y su ticket: `/admin/notifications`, `/platform/notifications`. */
	basePath: string;
}

/**
 * El centro de avisos conectado a la página: abre el stream al montar, lo
 * cierra al salir, lo duerme con la pestaña oculta y avisa con un toast lo
 * que llega en vivo. Se llama una vez por template, al inicializar el
 * componente (usa `$effect`).
 */
export function liveNotifications(options: LiveNotificationsOptions): NotificationCenter {
	const center = new NotificationCenter({
		inbox: options.inbox,
		ticketUrl: `${options.basePath}/ticket`,
		onNotification: (notification) => {
			const { title, body } = notificationText(notification);
			const show = isWarning(notification) ? toast.warning : toast;

			show(title, {
				description: body,
				action: { label: 'Ver', onClick: () => void goto(notificationHref(notification)) }
			});
		}
	});

	$effect(() => {
		const onVisibility = () => center.visibilityChanged(document.hidden);

		center.start();
		document.addEventListener('visibilitychange', onVisibility);

		return () => {
			document.removeEventListener('visibilitychange', onVisibility);
			center.stop();
		};
	});

	return center;
}
