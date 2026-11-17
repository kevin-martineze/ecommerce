// Librerías
import { describe, expect, it } from 'vitest';

// Dominio
import {
	changeText,
	describeDesignChanges,
	truncate,
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

const collections: DesignCollection[] = [{ id: 'col-negras', name: 'Negras' }];

describe('describeDesignChanges', () => {
	it('sin cambios no devuelve nada', () => {
		expect(describeDesignChanges(base, { ...base }, collections)).toEqual([]);
	});

	it('un cambio de plantilla usa el nombre visible y se destaca', () => {
		const changes = describeDesignChanges(base, { ...base, template: 'moda' }, collections);

		expect(changes).toHaveLength(1);
		expect(changes[0]).toMatchObject({
			section: 'estilo',
			field: 'Plantilla',
			kind: 'cambia',
			featured: true
		});
		expect(changes[0].antes).not.toBe('editorial');
		expect(changes[0].after).not.toBe('moda');
	});

	it('un color que aparece es «agrega» y trae su muestra', () => {
		const [change] = describeDesignChanges(base, { ...base, accent: '#6D28D9' }, collections);

		expect(change).toMatchObject({
			section: 'estilo',
			field: 'Color',
			kind: 'agrega',
			antes: '',
			after: '#6D28D9',
			swatch: '#6D28D9'
		});
	});

	it('un color que se quita vuelve a lo que trae la plantilla', () => {
		const saved = { ...base, accent: '#111111' };
		const [change] = describeDesignChanges(saved, base, collections);

		expect(change).toMatchObject({
			field: 'Color',
			kind: 'quita',
			antes: '#111111',
			note: 'Vuelve a lo que trae la plantilla'
		});
	});

	it('«Quitar mis ajustes» deja una nota en cada campo de estilo afectado', () => {
		const saved = {
			...base,
			accent: '#111111',
			fonts: 'serif',
			corners: 'round',
			hero: 'split'
		};
		const changes = describeDesignChanges(saved, base, collections);

		expect(changes.map((change) => change.field)).toEqual([
			'Color',
			'Letras',
			'Esquinas',
			'Estilo de la imagen de arriba'
		]);
		for (const change of changes) {
			expect(change.kind).toBe('quita');
			expect(change.note).toBe('Vuelve a lo que trae la plantilla');
		}
	});

	it('las letras, esquinas y estilo de portada usan su nombre visible', () => {
		const [fontCode] = describeDesignChanges(base, { ...base, fonts: 'serif' }, collections);

		expect(fontCode).toMatchObject({ field: 'Letras', kind: 'agrega', after: 'Clásica' });
	});

	it('la barra de anuncio que se borra sale como «quita»', () => {
		const saved = { ...base, announcement: 'Envío gratis hoy' };
		const [change] = describeDesignChanges(saved, base, collections);

		expect(change).toMatchObject({
			section: 'marca',
			field: 'Barra de anuncio',
			kind: 'quita',
			antes: 'Envío gratis hoy'
		});
	});

	it('un texto largo se trunca a 60 caracteres con …', () => {
		const largo = 'x'.repeat(90);
		const [change] = describeDesignChanges(base, { ...base, announcement: largo }, collections);

		expect(change.after).toHaveLength(60);
		expect(change.after.endsWith('…')).toBe(true);
	});

	it('la colección destacada sale por su nombre, no por el id', () => {
		const [change] = describeDesignChanges(
			base,
			{ ...base, heroCollectionId: 'col-negras' },
			collections
		);

		expect(change).toMatchObject({
			section: 'portada',
			field: 'Colección destacada',
			kind: 'agrega',
			antes: 'Ninguna',
			after: 'Negras',
			featured: true
		});
	});

	it('el orden sigue a las secciones: Estilo, Marca y Portada', () => {
		const draft = {
			...base,
			heroTitle: 'Nuevo',
			storeName: 'Otra',
			accent: '#111111',
			template: 'moda' as const
		};
		const sections = describeDesignChanges(base, draft, collections).map(
			(change) => change.section
		);

		expect(sections).toEqual(['estilo', 'estilo', 'marca', 'portada']);
	});
});

describe('recortar', () => {
	it('deja intacto un texto corto', () => {
		expect(truncate('Hola')).toBe('Hola');
	});
});

describe('textoDelCambio', () => {
	const change: DesignChange = {
		section: 'estilo',
		field: 'Plantilla',
		kind: 'cambia',
		antes: 'Moda',
		after: 'Minimal',
		featured: true
	};

	it('al guardar, un cambio dice «Cambia» con antes y después', () => {
		expect(changeText(change, 'guardar')).toBe('Cambia Plantilla: «Moda» → «Minimal»');
	});

	it('al guardar, un agregado dice «Agrega» con el valor nuevo', () => {
		const addItem: DesignChange = { ...change, kind: 'agrega', antes: '', after: 'Envíos gratis' };

		expect(changeText(addItem, 'guardar')).toBe('Agrega Plantilla: «Envíos gratis»');
	});

	it('al guardar, un quitado con nota dice la nota', () => {
		const removeItem: DesignChange = {
			...change,
			kind: 'quita',
			antes: 'Moda',
			after: '',
			note: 'Vuelve a lo que trae la plantilla'
		};

		expect(changeText(removeItem, 'guardar')).toBe(
			'Quita Plantilla · Vuelve a lo que trae la plantilla'
		);
	});

	it('al descartar, dice lo que se pierde con el valor guardado y el borrador', () => {
		const color: DesignChange = {
			section: 'estilo',
			field: 'Color',
			kind: 'cambia',
			antes: '#111111',
			after: '#6D28D9',
			featured: false
		};

		expect(changeText(color, 'descartar')).toBe('Se pierde: Color #111111 → #6D28D9');
	});
});
