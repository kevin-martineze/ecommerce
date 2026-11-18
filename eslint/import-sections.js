/**
 * Regla `local/import-sections`: los imports van en secciones, cada una con su
 * comentario de encabezado y en un orden fijo (CLAUDE.md, regla 32).
 *
 * La sección de un import sale de su ruta, así que nadie decide a mano dónde
 * va: `pnpm lint:fix` escribe los encabezados y ordena. Dentro de cada sección
 * se ordena por ruta.
 *
 * Si entre los imports hay un comentario que no es un encabezado, la regla
 * avisa pero no arregla: moverlo a ciegas podría separarlo de lo que explica.
 */

/** Las secciones, en el orden en que deben aparecer. */
export const SECTIONS = [
	'Tipos',
	'Svelte',
	'Librerías',
	'Iconos',
	'App',
	'Servidor',
	'Componentes',
	'Estado',
	'Dominio',
	'Utilidades',
	'Recursos'
];

const HEADERS = new Set(SECTIONS);

function basename(source) {
	return source.split('/').at(-1) ?? source;
}

/** Un `.svelte` con nombre en minúscula es un módulo con runes (`x.svelte.ts`), no un componente. */
function isRunesModule(source) {
	const name = basename(source);

	return name.endsWith('.svelte') && /^[a-z]/.test(name);
}

/**
 * La sección de un import.
 *
 * @param {string} source la ruta, tal cual aparece en el import
 * @param {{ typeOnly: boolean, sideEffect: boolean }} kind
 * @returns {string}
 */
export function sectionFor(source, kind) {
	if (kind.typeOnly) return 'Tipos';
	if (kind.sideEffect || /\.(css|png|jpe?g|svg|webp)$/.test(source)) return 'Recursos';
	if (source === 'svelte' || source.startsWith('svelte/') || source.startsWith('@sveltejs/')) {
		return 'Svelte';
	}
	if (source.startsWith('@lucide/')) return 'Iconos';
	if (source.startsWith('$app/') || source.startsWith('$env/')) return 'App';
	if (source.startsWith('$lib/server/') || source === '$lib/server') return 'Servidor';
	if (source.startsWith('$lib/assets/')) return 'Recursos';
	if (source.startsWith('$lib/stores/') || isRunesModule(source)) return 'Estado';
	if (source.startsWith('$lib/components/') || source.endsWith('.svelte')) return 'Componentes';
	if (/^\$lib\/(domain|schemas|config)(\/|$)/.test(source)) return 'Dominio';
	if (source.startsWith('$lib') || source.startsWith('.')) return 'Utilidades';

	return 'Librerías';
}

function compareSources(a, b) {
	const left = a.toLowerCase();
	const right = b.toLowerCase();

	if (left === right) return 0;

	return left < right ? -1 : 1;
}

/**
 * Agrupa y ordena los imports. Cada elemento trae su ruta, su clase y su texto
 * literal; devuelve las líneas finales, con encabezados y una línea en blanco
 * entre secciones.
 *
 * @param {{ source: string, typeOnly: boolean, sideEffect: boolean, text: string }[]} imports
 * @returns {string[][]} una lista por sección: el encabezado y el texto de cada import
 */
export function arrange(imports) {
	const bySection = new Map(SECTIONS.map((name) => [name, []]));

	for (const entry of imports) {
		bySection.get(sectionFor(entry.source, entry))?.push(entry);
	}

	const blocks = [];

	for (const [name, entries] of bySection) {
		if (entries.length === 0) continue;

		// Los tipos siguen el mismo orden que el resto: primero los de Svelte, al final los locales.
		const rank = (entry) =>
			SECTIONS.indexOf(sectionFor(entry.source, { typeOnly: false, sideEffect: false }));
		const sorted = [...entries].sort(
			(a, b) => rank(a) - rank(b) || compareSources(a.source, b.source)
		);

		blocks.push([`// ${name}`, ...sorted.map((entry) => entry.text)]);
	}

	return blocks;
}

function normalize(text) {
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line !== '')
		.join('\n');
}

function isHeader(comment) {
	return comment.type === 'Line' && HEADERS.has(comment.value.trim());
}

/** Las listas de sentencias: el programa, o en Svelte el cuerpo de cada `<script>`. */
function statementLists(program) {
	const scripts = program.body.filter((node) => node.type === 'SvelteScriptElement');

	return scripts.length > 0 ? scripts.map((script) => script.body) : [program.body];
}

/** Los imports seguidos, sin código entre ellos. */
function importRuns(statements, sourceCode) {
	const runs = [];
	let current = [];

	for (const node of statements) {
		if (node.type !== 'ImportDeclaration') {
			if (current.length > 0) runs.push(current);
			current = [];
			continue;
		}

		const previous = current.at(-1);

		if (previous) {
			const between = sourceCode.text.slice(previous.range[1], node.range[0]);
			const withoutComments = between.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');

			if (withoutComments.trim() !== '') {
				runs.push(current);
				current = [];
			}
		}

		current.push(node);
	}

	if (current.length > 0) runs.push(current);

	return runs;
}

function lineIndent(sourceCode, node) {
	const line = sourceCode.lines[node.loc.start.line - 1] ?? '';

	return line.match(/^\s*/)?.[0] ?? '';
}

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
	meta: {
		type: 'layout',
		fixable: 'code',
		docs: { description: 'Imports en secciones con encabezado y en orden fijo' },
		messages: {
			order:
				'Los imports van en secciones con encabezado (// Tipos, // Svelte, …) y en el orden de CLAUDE.md. Corre `pnpm lint:fix`.',
			stray:
				'Hay un comentario entre los imports que no es un encabezado de sección. Muévelo fuera y corre `pnpm lint:fix`.'
		},
		schema: []
	},

	create(context) {
		const sourceCode = context.sourceCode;

		return {
			Program(program) {
				const comments = sourceCode.getAllComments();

				const runs = statementLists(program).flatMap((statements) =>
					importRuns(statements, sourceCode)
				);

				for (const run of runs) {
					const first = run[0];
					const last = run.at(-1);

					// Los encabezados pegados justo encima del primer import son parte del bloque.
					let start = first.range[0];

					for (let index = comments.length - 1; index >= 0; index -= 1) {
						const comment = comments[index];

						if (comment.range[1] > start) continue;
						if (sourceCode.text.slice(comment.range[1], start).trim() !== '') break;
						if (!isHeader(comment)) break;

						start = comment.range[0];
					}

					const inside = comments.filter(
						(comment) => comment.range[0] >= start && comment.range[1] <= last.range[1]
					);

					const entries = run.map((node) => ({
						source: String(node.source.value),
						typeOnly: node.importKind === 'type',
						sideEffect: node.specifiers.length === 0,
						text: sourceCode.getText(node)
					}));

					const expected = arrange(entries);
					const actual = sourceCode.text.slice(start, last.range[1]);

					const flat = expected.map((block) => block.join('\n')).join('\n');

					if (normalize(actual) === normalize(flat)) continue;

					if (inside.some((comment) => !isHeader(comment))) {
						context.report({ node: first, messageId: 'stray' });
						continue;
					}

					const indent = lineIndent(sourceCode, first);
					// El texto de cada import se copia tal cual: sus líneas internas conservan su sangría.
					const text = expected.map((block) => block.join(`\n${indent}`)).join(`\n\n${indent}`);

					context.report({
						node: first,
						messageId: 'order',
						fix: (fixer) => fixer.replaceTextRange([start, last.range[1]], text)
					});
				}
			}
		};
	}
};

export default {
	rules: { 'import-sections': rule }
};
