// Tipos
import type { Actions, PageServerLoad } from './$types';

// Svelte
import { fail } from '@sveltejs/kit';

// Servidor
import {
	createHighlight,
	getSettings,
	listCollections,
	listHighlights,
	removeHighlight,
	removeStoreLogo,
	updateHighlight,
	updateSettings,
	uploadStoreLogo
} from '$lib/server/api/panel-content';
import { requireAdmin } from '$lib/server/auth';
import { failWith, orFail, panelContext, storeUrl } from '$lib/server/context';

// Dominio
import { accentProblem, isEmptyTheme } from '$lib/domain/theme';
import {
	heroSchema,
	homeHighlightSchema,
	storeThemeSchema,
	templateSchema,
	storeSchema
} from '$lib/schemas/admin';

/**
 * El editor de Diseño: estilo, marca y portada, con la tienda al lado.
 *
 * Vive fuera de `(panel)` para ocupar la pantalla entera, así que no hereda su
 * `load`: pide `requireAdmin` por su cuenta, igual que las actions.
 *
 * Hay dos clases de cambios. Los campos escalares (plantilla, color, letras,
 * esquinas, portada en plantilla, nombre, anuncio, colección y textos de la
 * portada) se guardan juntos con el botón Guardar. Los mensajes de abajo y el
 * logo son listas o archivos: se guardan al instante, cada uno con su acción.
 */
export const load: PageServerLoad = async (event) => {
	const { store } = await requireAdmin(event);
	const ctx = panelContext(event);

	const [settings, collections, highlights] = await Promise.all([
		getSettings(ctx),
		listCollections(ctx),
		listHighlights(ctx)
	]);

	const saved = orFail(settings);

	return {
		settings: saved,
		collections: orFail(collections).collections,
		highlights: orFail(highlights),
		// "Ver tienda": la dirección pública. La vista previa va al subdominio, en iframe.
		storeUrl: saved.public_url,
		previewUrl: storeUrl(store.slug)
	};
};

const firstIssue = (issues: { message: string }[]) => issues.at(0)?.message ?? 'Revisa los datos.';

function parseHighlight(formData: FormData) {
	return homeHighlightSchema.safeParse({
		eyebrow: formData.get('eyebrow'),
		title: formData.get('title'),
		body: formData.get('body'),
		sortOrder: formData.get('sortOrder') || 0,
		active: formData.get('active') === 'on'
	});
}

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export const actions: Actions = {
	/** Todo lo escalar a la vez: plantilla, color, letras, nombre, anuncio y portada. */
	save: async (event) => {
		const ctx = panelContext(event);
		const formData = await event.request.formData();

		const template = templateSchema.safeParse(formData.get('template'));

		if (!template.success) return fail(400, { error: firstIssue(template.error.issues) });

		const theme = storeThemeSchema.safeParse({
			accent: formData.get('accent') ?? '',
			fonts: formData.get('fonts') ?? '',
			corners: formData.get('corners') ?? '',
			hero: formData.get('hero') ?? ''
		});

		if (!theme.success) return fail(400, { error: firstIssue(theme.error.issues) });

		// Se mide contra la plantilla que se guarda junto con el color.
		const problem = accentProblem(template.data, theme.data.accent ?? '');

		if (problem) return fail(400, { error: problem });

		const brand = storeSchema.safeParse({
			storeName: formData.get('storeName') ?? '',
			announcement: formData.get('announcement') ?? ''
		});

		if (!brand.success) return fail(400, { error: firstIssue(brand.error.issues) });

		const portada = heroSchema.safeParse({
			heroCollectionId: String(formData.get('heroCollectionId') ?? '') || null,
			heroTitle: formData.get('heroTitle') ?? '',
			heroSubtitle: formData.get('heroSubtitle') ?? ''
		});

		if (!portada.success) return fail(400, { error: firstIssue(portada.error.issues) });

		// Una sola llamada: la API solo toca lo que viene, así que todo va junto.
		const result = await updateSettings(ctx, {
			template: template.data,
			theme: isEmptyTheme(theme.data) ? null : theme.data,
			storeName: brand.data.storeName,
			announcement: brand.data.announcement || null,
			heroCollectionId: portada.data.heroCollectionId ?? null,
			heroTitle: portada.data.heroTitle || null,
			heroSubtitle: portada.data.heroSubtitle || null
		});

		if (!result.ok) return failWith(result);

		return { message: 'Listo: tu tienda ya se ve así.' };
	},

	// Los mensajes de abajo se guardan al instante, uno por uno.
	createBlock: async (event) => {
		const ctx = panelContext(event);
		const parsed = parseHighlight(await event.request.formData());

		if (!parsed.success) return fail(400, { error: firstIssue(parsed.error.issues) });

		const result = await createHighlight(ctx, parsed.data);

		if (!result.ok) return failWith(result);

		return { message: 'Bloque creado.' };
	},

	updateBlock: async (event) => {
		const ctx = panelContext(event);
		const formData = await event.request.formData();
		const parsed = parseHighlight(formData);

		if (!parsed.success) return fail(400, { error: firstIssue(parsed.error.issues) });

		const result = await updateHighlight(ctx, String(formData.get('id') ?? ''), parsed.data);

		if (!result.ok) return failWith(result);

		return { message: 'Bloque guardado.' };
	},

	deleteBlock: async (event) => {
		const ctx = panelContext(event);
		const formData = await event.request.formData();

		const result = await removeHighlight(ctx, String(formData.get('id') ?? ''));

		if (!result.ok) return failWith(result);

		return { message: 'Bloque borrado.' };
	},

	// El logo también se guarda al instante: sube o se quita en el momento.
	uploadLogo: async (event) => {
		const ctx = panelContext(event);
		const formData = await event.request.formData();
		const file = formData.get('file');

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'Elige una imagen para el logo.' });
		}

		if (!LOGO_TYPES.includes(file.type)) {
			return fail(400, { error: 'El logo debe ser PNG, JPG, WebP o SVG.' });
		}

		if (file.size > LOGO_MAX_BYTES) {
			return fail(400, { error: 'El logo pesa más de 2 MB. Pruébalo más liviano.' });
		}

		const result = await uploadStoreLogo(ctx, file);

		if (!result.ok) {
			const failure = failWith(result);

			return fail(failure.status, { error: result.message });
		}

		return { message: 'Logo guardado. La tienda ya lo muestra.' };
	},

	removeLogo: async (event) => {
		const result = await removeStoreLogo(panelContext(event));

		if (!result.ok) {
			const failure = failWith(result);

			return fail(failure.status, { error: result.message });
		}

		return { message: 'Quitaste el logo: la tienda vuelve a mostrar el nombre.' };
	}
};
