// Tipos
import type { PageServerLoad } from './$types';

// Svelte
import { redirect } from '@sveltejs/kit';

/** La portada vive en Diseño, en su sección. Esta ruta solo redirige. */
export const load: PageServerLoad = () => {
	redirect(303, '/admin/personalizar?seccion=portada');
};
