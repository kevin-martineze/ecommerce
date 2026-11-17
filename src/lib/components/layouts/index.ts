// Los layouts: estructura, slots y scroll (CLAUDE.md, regla 21). Los que
// GlobUI ya trae se re-exportan aquí cuando se publique `@glob-ui/svelte`;
// estos tres todavía no existen en la librería y viven en el proyecto con su
// mismo contrato (`data-layout`, `data-slot`, `data-scroll`).
export { default as AuthLayout } from './AuthLayout.svelte';
export { default as CanvasLayout } from './CanvasLayout.svelte';
export { default as SettingsLayout } from './SettingsLayout.svelte';
