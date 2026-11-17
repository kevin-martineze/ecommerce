// Los layouts: estructura, slots y scroll (CLAUDE.md, regla 21). Son del
// proyecto, con la metodología de GlobUI: cada uno marca `data-layout`, y cada
// slot `data-slot` y `data-scroll` (`fixed` o `scroll`). No pintan contenido.
export { default as AppShellLayout } from './AppShellLayout.svelte';
export { default as AuthLayout } from './AuthLayout.svelte';
export { default as CanvasLayout } from './CanvasLayout.svelte';
export { useLayoutScroll } from './layout-scroll';
export { default as PageLayout } from './PageLayout.svelte';
export { default as SettingsLayout } from './SettingsLayout.svelte';
export { default as StackedLayout } from './StackedLayout.svelte';
