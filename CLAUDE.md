# CLAUDE.md — Reglas del proyecto

Léelo entero antes de generar código. Son las convenciones del proyecto, no
sugerencias. Cualquier desviación necesita justificación explícita.

Stack: **SvelteKit 2 + Svelte 5 (runes) + TypeScript strict + Tailwind v4 +
shadcn-svelte**, sobre la API propia `ecommerce-api`.

---

## 1. Reglas duras

### TypeScript

1. **Prohibido `any`.** Usa `unknown` con type guards.
2. **Prohibido `as`.** Si necesitas castear, generaliza el tipo en su origen o
   escribe una guarda que lea campo a campo (ver `readOrderResult` en
   `src/lib/server/orders.ts`).
3. **Prohibido `@ts-ignore` / `@ts-expect-error`.**
4. **Prohibido `console.log`.** Solo `console.warn` / `console.error`, y nunca
   con datos de clientas.

### Svelte 5

5. **Solo runes.** Cero `export let`, `$:`, `on:click`, `<slot>`. Usa `$state`,
   `$derived`, `$props`, `$effect`, `$bindable`, snippets y `{@render}`.
6. **`$derived` para todo cálculo derivado**, nunca `$effect` con `$state =`.
7. **`$effect` solo para efectos reales:** DOM, suscripciones, timers,
   hidratación de `localStorage`, envío programático de forms.
8. **Nada de subcomponentes declarados dentro de otro componente.**
9. **`{#each items as item (key)}` siempre con key.**
10. **Props con `interface Props` tipada.** Nunca se mutan: si necesitas estado
    local que parte de un prop, cópialo con `$state(untrack(() => …))`.

### Datos

11. **La carga inicial se hace en `+page.server.ts` / `+layout.server.ts`.** El
    cliente no hace `fetch` a la API.
12. **Las mutaciones van por form actions** con `use:enhance`.
13. **El carrito y los favoritos viven en `localStorage`** y llegan al servidor
    por form action, nunca por `fetch` manual.
14. **Errores en load: `error(status, mensaje)`** de `@sveltejs/kit`.
15. **Los precios se recalculan siempre en el servidor.** El navegador solo
    manda identificadores y cantidades.

### Datos: la API propia (`ecommerce-api`)

16. **Todo dato de la tienda viene de la API, y solo desde el servidor.** Tienda
    pública con `publicContext(event)` y `$lib/server/api/storefront.ts` /
    `checkout.ts`; panel con `panelContext(event)` y `$lib/server/api/panel-*.ts`;
    cuenta y consola de la plataforma con `accountContext(event)` y
    `$lib/server/api/auth.ts` / `platform.ts`.
    La tienda pública es la del host (`storeSlugFor`): subdominio de
    `STORE_ROOT_DOMAIN`, o `STORE_SLUG`. El panel opera sobre la tienda de la
    sesión, y `requireAdmin` la cambia a la del host si la cuenta es miembro.
17. **Toda form action del panel empieza con `panelContext(event)`.** Las actions
    no ejecutan el `load` del layout, así que no heredan `requireAdmin`.
18. **Las reglas de precio viven solo en la API.** El carrito cotiza con
    `quoteCart` y el pedido lo arma la API: el frontend no recalcula totales.
19. **Las respuestas se leen con zod y se traducen a `$lib/domain/*` dentro de
    `$lib/server/api/`.** Las páginas no conocen la forma de la API; si un campo
    cambia allá, se ajusta el esquema y no los componentes.

### Fotos

Se reenvían a la API tal cual llegan del formulario (`uploadProductImage`,
`uploadCollectionHero`): la API las convierte, las guarda y las borra. Este
proyecto no procesa ni almacena imágenes. `supabase/` es historia: el
esquema y los datos viven en la API.

### Cliente de la API

- **Un archivo por superficie** en `$lib/server/api/`, sobre `publicRequest` y
  `panelRequest` de `request.ts`.
- **Nunca lanza: devuelve `ApiResult<T>`.** Se narrowa con `if (!result.ok)`;
  `result.message` ya viene en español, listo para la dueña.
- **Toda respuesta se lee con un esquema zod**, nunca con `as`.
- **La sesión del panel es `locals.session`**, cifrada en la cookie
  `tienda_session`. Toda carga del panel pasa por `requireAdmin`, que además
  verifica contra la API que la membresía siga viva. Una sesión sin tienda
  (`storeId: null`) solo la tiene quien administra la plataforma: entra a
  `/platform` (`requirePlatformAdmin`), nunca al panel.
- **Los permisos los decide la API.** El panel oculta lo que el rol no puede
  hacer (`data.role`), pero la regla vive allá; un 403 llega con su mensaje.
- **Todo `redirectTo` que llegue en la URL pasa por `safeRedirectTarget`.**

### UI

20. **Los consumidores importan de `$lib/components/atoms/*`, nunca de
    `$lib/components/ui/*`.** Los átomos son el lugar de los overrides de marca.
    Si una primitiva no existe: `pnpm dlx shadcn-svelte@latest add <nombre>` y
    luego crea el átomo que la re-exporta.
21. **Atomic design:** `atoms → molecules → organisms → templates → pages`. Un
    componente solo importa de niveles inferiores. Los **layouts**
    (`$lib/components/layouts/*`) son propios y deciden estructura, slots y
    scroll: `AppShellLayout` (panel: barra lateral y solo `main` hace scroll),
    `StackedLayout` (barra, contenido y pie con scroll de ventana; la barra es
    `sticky`, `overlay` o `static`), `PageLayout` (encabezado, contenido y
    columna lateral), `SplitLayout` (filtros, ficha o resumen), `AuthLayout`,
    `CanvasLayout` (editor a pantalla completa) y `SettingsLayout`. La raíz
    lleva `data-layout` y cada slot `data-slot` y `data-scroll`; lo pegado se
    pone bajo la barra con `var(--layout-header-h)`.
    Un **template** (`$lib/components/templates/*`) usa un layout, fija sus
    slots (marca, navegación) y expone props para lo demás: `AdminTemplate`,
    `PageTemplate`, `PreviewTemplate`, `EditorTemplate`, `StorefrontTemplate`,
    `MarketingTemplate`, `LegalTemplate`, `PlatformTemplate`, `AuthTemplate`,
    `ErrorTemplate`. El `<h1>` lo pone el template (`PageHeader`). Una
    **página** solo pone el contenido que cambia: nunca alturas, `overflow`,
    `sticky` ni `100vh`. Las cabeceras y pies (organismos) tampoco: su
    posición y su landmark (`<header>`, `<footer>`) los pone el layout.
22. **Solo tokens de Tailwind** (`bg-background`, `text-muted-foreground`,
    `text-sale`, `bg-whatsapp`…). Cero `bg-[#…]`, cero `text-[12px]`.
23. **`cn()` para clases dinámicas.**
24. **Iconos: solo `@lucide/svelte`.** Cero emojis en la interfaz. Ojo: lucide ya
    no trae iconos de marca (no existe `instagram`).
25. **`type="button"` explícito** en todo botón que no sea submit.
26. **Los filtros, el orden y la paginación viven en `URLSearchParams`**, no en
    `$state`.

### Formularios

27. **Schemas zod en `$lib/schemas/`**, uno por dominio.
28. **Validación en el servidor siempre**, aunque el input tenga `required`.
29. **Botones de submit deshabilitados mientras se envía.**
30. **El resultado de una acción del panel se avisa con toast.** La acción devuelve
    `{ message }` o `fail(status, { error })` y `ActionToasts` (en el layout) lo
    muestra. `FormFeedback` solo para errores que deban quedarse junto a un formulario
    largo.

### Imports

31. **Alias `$lib/`** para todo lo de `src/lib/`. Cero `../../`.
32. **Secciones con encabezado, en este orden:** `// Tipos`, `// Svelte`,
    `// Librerías`, `// Iconos`, `// App`, `// Servidor`, `// Componentes`,
    `// Estado`, `// Dominio`, `// Utilidades`, `// Recursos`. Solo las que
    tengan imports, con una línea en blanco entre ellas y ordenadas por ruta
    dentro de cada una. La regla `local/import-sections`
    (`eslint/import-sections.js`) decide la sección por la ruta y
    `pnpm lint:fix` las escribe.

### Nombres

33. **Todo lo que es código va en inglés:** carpetas de rutas (y por lo tanto
    las URLs), componentes, archivos, funciones, variables y nombres de form
    actions (`?/create`, `?/delete`). Los comentarios y los textos de cara al
    público van en español.
34. **Una URL que cambia deja una redirección 308** en
    `$lib/config/legacy-routes.ts`. Nunca se rompe un enlace publicado.

### ViewModels

35. **Una pantalla con más de ~5 `$state` o con un borrador que se
    previsualiza tiene ViewModel:** una clase con runes en un `*.svelte.ts`
    junto a su ruta (`design-editor.svelte.ts`), con su prueba. La vista solo
    pinta y llama sus métodos. Un listado que carga en el servidor y muta por
    form action no lo necesita.

---

## 2. Textos de cara al público

Todo en español de Colombia, tuteando y sin tecnicismos. Los precios se muestran
con `formatMoney` (`$89.900`, sin decimales). Los estados internos se guardan en
inglés (`pending`, `shipped`) y se traducen al pintarlos con
`ORDER_STATUS_LABEL`.

---

## 3. Gates

`pnpm check`, `pnpm lint`, `pnpm format:check`, `pnpm test` y `pnpm build` deben
pasar. El pre-commit corre Prettier, ESLint y un grep que bloquea `console.log`,
`: any`, `as any`, `@ts-ignore`, `export let`, `on:click` y `$:`. Si falla, se
arregla la causa: nunca `--no-verify`.

---

## 4. Antes de crear algo nuevo

Lee un archivo equivalente que ya exista y replica el patrón:

- Página de listado con filtros → `src/routes/(shop)/shop/+page.svelte`
- Página con form action → `src/routes/(shop)/cart/+page.server.ts`
- Pantalla de administración → `src/routes/(admin)/admin/(panel)/coupons/`
- Llamada a la API (tienda pública) → `src/lib/server/api/storefront.ts`
- Llamada a la API (panel) → `src/lib/server/api/panel-catalog.ts`
