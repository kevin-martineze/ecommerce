// Librerías
import { describe, expect, it } from 'vitest';

// Utilidades
import { arrange, sectionFor } from './import-sections.js';

const value = { typeOnly: false, sideEffect: false };

describe('sectionFor', () => {
	it.each([
		['svelte', 'Svelte'],
		['@sveltejs/kit', 'Svelte'],
		['zod', 'Librerías'],
		['@lucide/svelte/icons/plus', 'Iconos'],
		['$app/forms', 'App'],
		['$env/dynamic/public', 'App'],
		['$lib/server/api/storefront', 'Servidor'],
		['$lib/components/atoms/button', 'Componentes'],
		['./OrderRow.svelte', 'Componentes'],
		['$lib/stores/cart.svelte', 'Estado'],
		['$lib/utils/delete-confirm.svelte', 'Estado'],
		['./design-editor.svelte', 'Estado'],
		['$lib/domain/orders', 'Dominio'],
		['$lib/schemas/admin', 'Dominio'],
		['$lib/utils/money', 'Utilidades'],
		['$lib/tenant', 'Utilidades'],
		['./helpers', 'Utilidades'],
		['$lib/assets/logo.png', 'Recursos']
	])('%s va en %s', (source, section) => {
		expect(sectionFor(source, value)).toBe(section);
	});

	it('los imports de solo tipos van en Tipos', () => {
		expect(sectionFor('./$types', { typeOnly: true, sideEffect: false })).toBe('Tipos');
	});

	it('los imports sin nombres (estilos) van en Recursos', () => {
		expect(sectionFor('../app.css', { typeOnly: false, sideEffect: true })).toBe('Recursos');
	});
});

describe('arrange', () => {
	it('pone encabezados y ordena por sección y por ruta', () => {
		const blocks = arrange([
			{ ...value, source: '$lib/utils', text: "import { cn } from '$lib/utils';" },
			{ ...value, source: 'svelte', text: "import { tick } from 'svelte';" },
			{ ...value, source: '$app/state', text: "import { page } from '$app/state';" },
			{ ...value, source: '$app/forms', text: "import { enhance } from '$app/forms';" }
		]);

		expect(blocks).toEqual([
			['// Svelte', "import { tick } from 'svelte';"],
			['// App', "import { enhance } from '$app/forms';", "import { page } from '$app/state';"],
			['// Utilidades', "import { cn } from '$lib/utils';"]
		]);
	});
});
