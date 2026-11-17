import { redirect } from '@sveltejs/kit';

import type { PageServerLoad } from './$types';

/** La portada vive en Diseño, en su sección. Esta ruta solo redirige. */
export const load: PageServerLoad = () => {
	redirect(303, '/admin/personalizar?seccion=portada');
};
