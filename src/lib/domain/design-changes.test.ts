// Librerías
import { describe, expect, it } from 'vitest';

// Dominio
import {
	textoDelCambio,
	describeDesignChanges,
	recortar,
	type DesignChange,
	type DesignCollection,
	type DesignSnapshot
} from '$lib/domain/design-changes';

const base: DesignSnapshot = {
	template: 'editorial',
	accent: '',
	fonts: '',
	corners: '',
	hero: '',
	storeName: 'Mi tienda',
	announcement: '',
	heroCollectionId: '',
	heroTitle: '',
	heroSubtitle: ''
};

const colecciones: DesignCollection[] = [{ id: 'col-negras', name: 'Negras' }];

describe('describeDesignChanges', () => {
	it('sin cambios no devuelve nada', () => {
		expect(describeDesignChanges(base, { ...base }, colecciones)).toEqual([]);
	});

	it('un cambio de plantilla usa el nombre visible y se destaca', () => {
		const cambios = describeDesignChanges(base, { ...base, template: 'moda' }, colecciones);

		expect(cambios).toHaveLength(1);
		expect(cambios[0]).toMatchObject({
			seccion: 'estilo',
			campo: 'Plantilla',
			tipo: 'cambia',
			destacado: true
		});
		expect(cambios[0].antes).not.toBe('editorial');
		expect(cambios[0].despues).not.toBe('moda');
	});

	it('un color que aparece es «agrega» y trae su muestra', () => {
		const [cambio] = describeDesignChanges(base, { ...base, accent: '#6D28D9' }, colecciones);

		expect(cambio).toMatchObject({
			seccion: 'estilo',
			campo: 'Color',
			tipo: 'agrega',
			antes: '',
			despues: '#6D28D9',
			swatch: '#6D28D9'
		});
	});

	it('un color que se quita vuelve a lo que trae la plantilla', () => {
		const guardado = { ...base, accent: '#111111' };
		const [cambio] = describeDesignChanges(guardado, base, colecciones);

		expect(cambio).toMatchObject({
			campo: 'Color',
			tipo: 'quita',
			antes: '#111111',
			nota: 'Vuelve a lo que trae la plantilla'
		});
	});

	it('«Quitar mis ajustes» deja una nota en cada campo de estilo afectado', () => {
		const guardado = {
			...base,
			accent: '#111111',
			fonts: 'serif',
			corners: 'round',
			hero: 'split'
		};
		const cambios = describeDesignChanges(guardado, base, colecciones);

		expect(cambios.map((cambio) => cambio.campo)).toEqual([
			'Color',
			'Letras',
			'Esquinas',
			'Estilo de la imagen de arriba'
		]);
		for (const cambio of cambios) {
			expect(cambio.tipo).toBe('quita');
			expect(cambio.nota).toBe('Vuelve a lo que trae la plantilla');
		}
	});

	it('las letras, esquinas y estilo de portada usan su nombre visible', () => {
		const [letras] = describeDesignChanges(base, { ...base, fonts: 'serif' }, colecciones);

		expect(letras).toMatchObject({ campo: 'Letras', tipo: 'agrega', despues: 'Clásica' });
	});

	it('la barra de anuncio que se borra sale como «quita»', () => {
		const guardado = { ...base, announcement: 'Envío gratis hoy' };
		const [cambio] = describeDesignChanges(guardado, base, colecciones);

		expect(cambio).toMatchObject({
			seccion: 'marca',
			campo: 'Barra de anuncio',
			tipo: 'quita',
			antes: 'Envío gratis hoy'
		});
	});

	it('un texto largo se trunca a 60 caracteres con …', () => {
		const largo = 'x'.repeat(90);
		const [cambio] = describeDesignChanges(base, { ...base, announcement: largo }, colecciones);

		expect(cambio.despues).toHaveLength(60);
		expect(cambio.despues.endsWith('…')).toBe(true);
	});

	it('la colección destacada sale por su nombre, no por el id', () => {
		const [cambio] = describeDesignChanges(
			base,
			{ ...base, heroCollectionId: 'col-negras' },
			colecciones
		);

		expect(cambio).toMatchObject({
			seccion: 'portada',
			campo: 'Colección destacada',
			tipo: 'agrega',
			antes: 'Ninguna',
			despues: 'Negras',
			destacado: true
		});
	});

	it('el orden sigue a las secciones: Estilo, Marca y Portada', () => {
		const borrador = {
			...base,
			heroTitle: 'Nuevo',
			storeName: 'Otra',
			accent: '#111111',
			template: 'moda' as const
		};
		const secciones = describeDesignChanges(base, borrador, colecciones).map(
			(cambio) => cambio.seccion
		);

		expect(secciones).toEqual(['estilo', 'estilo', 'marca', 'portada']);
	});
});

describe('recortar', () => {
	it('deja intacto un texto corto', () => {
		expect(recortar('Hola')).toBe('Hola');
	});
});

describe('textoDelCambio', () => {
	const cambia: DesignChange = {
		seccion: 'estilo',
		campo: 'Plantilla',
		tipo: 'cambia',
		antes: 'Moda',
		despues: 'Minimal',
		destacado: true
	};

	it('al guardar, un cambio dice «Cambia» con antes y después', () => {
		expect(textoDelCambio(cambia, 'guardar')).toBe('Cambia Plantilla: «Moda» → «Minimal»');
	});

	it('al guardar, un agregado dice «Agrega» con el valor nuevo', () => {
		const agrega: DesignChange = { ...cambia, tipo: 'agrega', antes: '', despues: 'Envíos gratis' };

		expect(textoDelCambio(agrega, 'guardar')).toBe('Agrega Plantilla: «Envíos gratis»');
	});

	it('al guardar, un quitado con nota dice la nota', () => {
		const quita: DesignChange = {
			...cambia,
			tipo: 'quita',
			antes: 'Moda',
			despues: '',
			nota: 'Vuelve a lo que trae la plantilla'
		};

		expect(textoDelCambio(quita, 'guardar')).toBe(
			'Quita Plantilla · Vuelve a lo que trae la plantilla'
		);
	});

	it('al descartar, dice lo que se pierde con el valor guardado y el borrador', () => {
		const color: DesignChange = {
			seccion: 'estilo',
			campo: 'Color',
			tipo: 'cambia',
			antes: '#111111',
			despues: '#6D28D9',
			destacado: false
		};

		expect(textoDelCambio(color, 'descartar')).toBe('Se pierde: Color #111111 → #6D28D9');
	});
});
