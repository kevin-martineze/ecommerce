// Tipos
import type { LayoutServerLoad } from './$types';

// Servidor
import { platformNotificationsPreview } from '$lib/server/api/platform-notifications';
import { requirePlatformAdmin } from '$lib/server/auth';
import { accountContext } from '$lib/server/context';

export const load: LayoutServerLoad = async (event) => {
	const account = await requirePlatformAdmin(event);

	return {
		adminEmail: account.user.email,
		// Si además administra alguna tienda, el enlace al panel tiene sentido.
		hasStores: account.stores.length > 0,
		// La campana: los últimos avisos. Si falla, queda vacía y la consola sigue.
		notifications: await platformNotificationsPreview(accountContext(event))
	};
};
