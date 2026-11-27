# Plan: encabezado de página fijo en el panel y la plataforma

Estado: **planificado, sin implementar**. 26 de noviembre de 2026.

## 0. Qué cambia

Hoy en `/admin/*` y `/platform/*` todo el contenido de `main` hace scroll,
incluido el encabezado de la página (título, descripción y acciones como
"Buscar" o "Nuevo producto"). Al bajar por una lista larga (116 productos), el
título y las acciones se pierden.

Después: el encabezado se queda arriba y solo se mueve lo que hay debajo.

## 1. Decisiones

| Tema                            | Decisión                                                                                            | Por qué                                                                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Cómo                            | `position: sticky` del encabezado dentro de `main`. **No** se crea una segunda región de scroll.    | `main` sigue siendo la única región de scroll: `useLayoutScroll`, el volver arriba de `afterNavigate` y los saltos a ancla no cambian. |
| Dónde                           | Solo en `PageLayout` (`src/lib/components/layouts/PageLayout.svelte`).                              | Lo usan `PageTemplate` y `PreviewTemplate`, y nada más. Las páginas no se tocan (regla 21: las páginas no ponen `sticky`).             |
| Desde qué ancho                 | Desde `md` (768 px). En celular el encabezado se va con el scroll, como hoy.                        | En un celular, un título de dos líneas con acciones y descripción ocupa casi media pantalla.                                           |
| Fondo                           | `bg-background`, para que el contenido no se vea por detrás.                                        |                                                                                                                                        |
| Separación                      | Línea inferior `border-border` que **solo aparece cuando ya se hizo scroll**. En reposo, sin línea. | Con línea fija se ve pesado arriba de todo.                                                                                            |
| Columna lateral y `SplitLayout` | Se pegan **debajo** del encabezado, no detrás.                                                      | Hoy usan `top: calc(var(--layout-header-h,0px) + 1.5rem)`. `PageLayout` define esa variable con la altura medida de su encabezado.     |

## 2. Cambios en `PageLayout.svelte`

1. **Padding:** la raíz deja de llevar `py-8` y pasa a `pb-8`. El encabezado
   lleva `pt-8 pb-6` en lugar de `mb-6`. Así, cuando se pega, conserva su aire
   arriba y no queda el título contra el borde.
2. **Sticky:** el contenedor `data-slot="header"` pasa a
   `md:sticky md:top-0 z-10 bg-background`.
3. **Altura medida:** `bind:clientHeight={headerHeight}` en el contenedor del
   encabezado. En la raíz, `style="--layout-header-h: {headerHeight}px"` solo
   cuando hay encabezado. Eso hace que `aside` y `SplitLayout` se peguen debajo
   (los dos son `lg:sticky`, y desde `lg` el encabezado ya está pegado).
4. **Línea al hacer scroll:** con `useLayoutScroll()` (de `./layout-scroll`)
   se obtiene la región de scroll. En un `$effect` (efecto real de DOM, regla
   7), se escucha su `scroll` con `{ passive: true }` y se pone
   `stuck = region.scrollTop > 0`. El efecto devuelve la limpieza del listener.
   `stuck` es `$state(false)`. La clase del encabezado añade, con `cn()`,
   `md:border-b` siempre y `border-transparent` o `border-border` según
   `stuck`. Así la altura no cambia al aparecer la línea.
5. **Opt-out:** prop nueva `stickyHeader?: boolean` (por defecto `true`) para
   una página que lo necesite apagar. `PageTemplate` y `PreviewTemplate` la
   reenvían como prop opcional. Hoy ninguna página la usa.
6. **Comentario `@component`:** actualizarlo con el comportamiento nuevo.

`data-scroll="fixed"` del encabezado ya describe bien lo que hace; se queda.

## 3. Qué revisar

- `/admin/products` con 100+ productos: al bajar, el título y las acciones
  quedan arriba y la tabla pasa por debajo sin verse a través.
- `/admin/orders/[id]` y `/platform/stores/[id]`, que tienen columna lateral:
  la columna se pega debajo del encabezado, no encima ni detrás.
- Una página con `PreviewTemplate` (cupones, colecciones o envíos): la vista
  previa de la derecha se pega debajo del encabezado.
- Ancho 375 px (celular): el encabezado se va con el scroll y nada se tapa.
- Un `Select` o un menú desplegable de las acciones del encabezado se abre por
  encima del contenido (los popovers van en portal; confirmarlo).
- Navegar entre páginas: sigue volviendo arriba.
- Tema oscuro: el fondo del encabezado es el del panel, sin franja de otro tono.
  Con `variant="inset"` del `AppShellLayout`, `main` es `bg-background`.

## 4. Gates

`pnpm check`, `pnpm lint`, `pnpm format:check`, `pnpm test` y `pnpm build`.
Capturas de `/admin/products` arriba y bajando, en escritorio y en celular.

## 5. Fuera de alcance

- La cabecera de las tablas pegada (`thead` sticky).
- Los layouts de la tienda pública (`StackedLayout`) y del editor (`CanvasLayout`).
