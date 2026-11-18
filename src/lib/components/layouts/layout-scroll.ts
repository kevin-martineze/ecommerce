// Svelte
import { getContext, setContext } from 'svelte';

const KEY = Symbol('layout-scroll');

/** Devuelve el elemento que hace scroll, o null si todavía no está montado. */
export type LayoutScroll = () => Element | null;

/** Lo llama un layout con slot de scroll: así sus hijos encuentran la región. */
export function provideLayoutScroll(scroll: LayoutScroll) {
	setContext(KEY, scroll);
}

/**
 * La región de scroll del layout más cercano, para volver arriba, seguir una
 * lista larga o llevar a una sección. Sin layout con scroll, es la página.
 * Nadie busca la región en el DOM a mano.
 *
 * Se llama al iniciar el componente (lee el contexto); lo que devuelve se
 * llama cuando se necesita el elemento.
 */
export function useLayoutScroll(): LayoutScroll {
	const scroll = getContext<LayoutScroll | undefined>(KEY);

	return () => scroll?.() ?? document.scrollingElement;
}
