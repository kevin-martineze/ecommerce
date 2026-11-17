# Plan: refactor del panel de administración

Estado: **propuesta, sin implementar** (17 de noviembre de 2026).

Alcance: `src/routes/(admin)/` y lo que usa de `src/lib/`. La tienda pública,
el marketing y `/plataforma` quedan para después, con el mismo patrón.

## Diagnóstico

Medido sobre `src/routes/(admin)/admin` (57 archivos, 7.587 líneas):

| Problema                                     | Evidencia                                                                                                                                                                                                                                           |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cada página decide su estructura y su scroll | `(panel)/+layout.svelte` (240 líneas) arma a mano sidebar, `sticky`, `h-screen` y el menú del celular (una fila horizontal con scroll, sin `Sheet`). `personalizar/+page.svelte` vuelve a hacerlo con `lg:h-screen`, `min-h-0` y `overflow-y-auto`. |
| Encabezado de página copiado                 | 23 `<h1>` y 26 `text-3xl` escritos a mano, cada uno con su `<header class="mb-6">`.                                                                                                                                                                 |
| Tarjetas copiadas                            | 14 `border-border bg-card rounded-lg … p-6` a mano, aunque existe `atoms/card`.                                                                                                                                                                     |
| Campos copiados                              | 28 `<div class="space-y-2"><Label/><Input/></div>` y 40 `<Label for>`. Ya hay `TextField`, `SelectField`, `MoneyField`, pero la mitad de las páginas no los usa.                                                                                    |
| `use:enhance` repetido                       | 33 callbacks en línea que hacen casi lo mismo: `saving = true`, `await update()`, limpiar el form si salió bien.                                                                                                                                    |
| Actions repetidas                            | 53 `formData()`, 33 `safeParse` con el mapeo campo a campo a mano, 59 `fail(` con el mismo `issues.at(0)?.message ?? 'Revisa los datos.'`.                                                                                                          |
| Lógica de cliente dentro de la vista         | `personalizar/+page.svelte`: 844 líneas, 299 de `<script>`, ~40 `$state`/`$derived`/funciones. Imposible de probar sin montar la página.                                                                                                            |
| Dependencia muerta                           | `sveltekit-superforms` está en `package.json` y no se importa en ningún lado.                                                                                                                                                                       |
| Nombres mezclados                            | Carpetas, componentes, archivos de dominio y actions en español (`pedidos/`, `CobroWompiEstado.svelte`, `diseno.ts`, `?/crear`) junto a otros en inglés (`ProductForm`, `panel-catalog.ts`).                                                        |

Lo que **ya está bien** y no se toca: la capa de datos (`$lib/server/api/*`
con `ApiResult` y zod, `panelContext`, `failWith`/`orFail`), `$lib/domain/*`
con sus pruebas, los átomos sobre shadcn-svelte y las reglas de
`CLAUDE.md`.

## Decisiones

### 1. Layouts y templates con la metodología de GlobUI

Las tres capas de `GlobUI/docs/design/layouts-and-templates.md`:

| Capa     | Dónde vive                           | Hace                                                        | Nunca hace                  |
| -------- | ------------------------------------ | ----------------------------------------------------------- | --------------------------- |
| Layout   | `@glob-ui/svelte/*`                  | Estructura, slots, scroll, landmarks, menú móvil en `Sheet` | Pintar contenido            |
| Template | `$lib/components/templates/` (nuevo) | Fija slots (marca, navegación) y expone props para lo demás | Poner alturas u `overflow`  |
| Página   | `src/routes/**/+page.svelte`         | Solo el contenido que cambia                                | Decidir estructura o scroll |

Esto completa el atomic design que ya dice `CLAUDE.md` (regla 21): hoy se
corta en `organisms`; faltan `templates` y las páginas. Orden nuevo:
`atoms → molecules → organisms → templates → pages`.

### 2. MVVM, pero solo donde hay estado de cliente

En SvelteKit el patrón ya está medio armado:

| MVVM      | En este proyecto                                                                     |
| --------- | ------------------------------------------------------------------------------------ |
| Model     | `$lib/domain/*` (tipos y reglas puras) + `$lib/server/api/*` (datos)                 |
| ViewModel | **Nuevo:** clases en `*.svelte.ts` con runes, una por pantalla con estado de cliente |
| View      | `+page.svelte` y componentes: solo pintan y llaman métodos del ViewModel             |

No todas las páginas necesitan ViewModel. Un listado que carga en
`+page.server.ts` y muta por form action no tiene estado que modelar: meterle
una clase es ceremonia. El criterio: **ViewModel cuando la página tiene más de
~5 `$state` o un borrador que se previsualiza**. Hoy aplica a `personalizar`,
`productos/[id]`, `productos/nuevo`, `colecciones`, `cupones` y `envios`.

Ya hay precedente en el repo: `DeleteConfirm` (`$lib/utils/delete-confirm.svelte.ts`)
y `$lib/stores/*.svelte.ts`.

Forma de un ViewModel:

```ts
// src/routes/(admin)/admin/(editor)/design/design-editor.svelte.ts
export class DesignEditor {
	template = $state<TemplateId>('classic');
	accent = $state('');
	// …

	readonly draft = $derived<StorefrontDraft>({/* … */});
	readonly changes = $derived(designChanges(this.saved, this.current));
	readonly dirty = $derived(this.changes.length > 0);

	constructor(private saved: DesignSettings) {
		this.template = saved.template;
		// …
	}

	reset(): void {
		/* … */
	}
}
```

La vista: `const editor = new DesignEditor(untrack(() => data.settings));`.
El ViewModel vive junto a su ruta (no en `$lib`) porque no se reutiliza; se
prueba con Vitest sin montar la página.

### 3. Adoptar GlobUI: sí, pero solo los layouts por ahora

Estado real de `@glob-ui/svelte` (0.3.0 en el repo):

- Trae `Layout` (slots, `SkipLink`, menú móvil), `AppShellLayout`,
  `PageLayout` + `PageHeader`, `StackedLayout`, `Dialog` y `Sheet`.
- **No está publicado en npm** (`npm view @glob-ui/svelte` da 404; solo
  `@glob-ui/all`, que es React).
- Los componentes de formulario en Svelte son la fase 10d y los templates la
  10g: todavía no existen.
- Faltan en todos los frameworks `SettingsLayout`, `CanvasLayout`,
  `SplitViewLayout` y `AuthLayout`.
- Usa tokens `--glob-*`; este proyecto usa los de shadcn (`--background`,
  `--sidebar`, …).

Impacto según cuánto se adopte:

| Opción                                                 | Costo                                                  | Ganancia                                                            | Veredicto                        |
| ------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------- | -------------------------------- |
| Solo layouts de GlobUI; átomos siguen en shadcn-svelte | Bajo: un puente de tokens y reescribir 2 layouts       | El scroll, el menú móvil y los landmarks salen resueltos y probados | **Recomendado**                  |
| Cambiar también los átomos por GlobUI                  | Alto: tocar casi los 57 archivos del panel y la tienda | Poca: los átomos de shadcn ya funcionan y ya tienen la marca        | Esperar a que exista la fase 10d |
| No usar GlobUI                                         | Nulo                                                   | Ninguna: se vuelve a resolver a mano lo que GlobUI ya resolvió      | No                               |

Lo que hay que hacer en GlobUI antes (y le sirve a la librería como
_dogfooding_):

1. Publicar `@glob-ui/svelte` (fase 10h adelantada solo para Svelte) o, mientras
   tanto, consumirlo con `pnpm link`.
2. Portar a Svelte `SettingsLayout` y `CanvasLayout`, con su contrato.
3. Que acepte un puente de tokens: el consumidor mapea `--glob-*` a sus
   variables en `app.css` y no se duplica la paleta.

Puente en `src/app.css`:

```css
@import '@glob-ui/styles';
@source '../node_modules/@glob-ui/svelte/dist/**/*.{svelte,js}';

:root {
	--glob-surface: var(--background);
	--glob-text: var(--foreground);
	--glob-border: var(--border);
	--glob-primary: var(--primary);
	/* … el resto de --glob-* */
}
```

Regla 20 de `CLAUDE.md` se extiende: los consumidores importan layouts desde
`$lib/components/templates/*` o re-exportados en `$lib/components/layouts/*`,
nunca directo desde `@glob-ui/svelte`, igual que con `ui/` y `atoms/`.

### 4. Nombres en inglés

Todo lo que es código pasa a inglés: carpetas de rutas, componentes, archivos de
`$lib`, funciones, nombres de actions (`?/create`, `?/delete`). Los textos de
cara al público siguen en español (sección 2 de `CLAUDE.md`).

**Decidido (17 de noviembre de 2026): todas las URLs en inglés**, en el panel,
la tienda pública, el marketing y `/plataforma`. La carpeta es la URL: no hay
capa de traducción de rutas.

Cada URL vieja redirige con **308** a la nueva desde `hooks.server.ts`, con un
mapa único en `$lib/config/legacy-routes.ts` (ruta vieja → nueva, con
parámetros). Así siguen funcionando los enlaces guardados, los compartidos por
WhatsApp y los que tiene indexados Google. Las redirecciones se quedan al
menos un año.

En la tienda pública el cambio afecta el SEO por unas semanas, mientras Google
cambia las URLs indexadas. Se mitiga con las 308, `sitemap.xml` con las URLs
nuevas y `<link rel="canonical">` en cada página.

Mapa del panel:

| Hoy                                              | Nuevo                                       |
| ------------------------------------------------ | ------------------------------------------- |
| `ajustes`                                        | `settings`                                  |
| `avisos`                                         | `restock-alerts`                            |
| `bienvenida`                                     | `welcome`                                   |
| `catalogos`                                      | `catalogs`                                  |
| `colecciones`                                    | `collections`                               |
| `cuenta`                                         | `account`                                   |
| `cupones`                                        | `coupons`                                   |
| `dominio`                                        | `domain`                                    |
| `envios`                                         | `shipping`                                  |
| `equipo`                                         | `team`                                      |
| `inventario`                                     | `inventory`                                 |
| `pagos`                                          | `payments`                                  |
| `pedidos`, `pedidos/[id]`                        | `orders`, `orders/[id]`                     |
| `plan`                                           | `plan`                                      |
| `portada`                                        | `cover`                                     |
| `productos`, `productos/nuevo`, `productos/[id]` | `products`, `products/new`, `products/[id]` |
| `soporte`, `soporte/[ticketId]`                  | `support`, `support/[ticketId]`             |
| `(editor)/personalizar`                          | `(editor)/design`                           |
| `cambiar-tienda`                                 | `switch-store`                              |
| `recuperar`                                      | `forgot-password`                           |
| `restablecer`                                    | `reset-password`                            |
| `invitacion`                                     | `invitation`                                |

Mapa del resto (fase 6):

| Hoy                                                            | Nuevo                                                      |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| `(shop)/tienda`                                                | `shop`                                                     |
| `(shop)/tienda/[slug]`                                         | `shop/[slug]`                                              |
| `(shop)/coleccion`, `(shop)/colecciones`                       | `collections` (unificar)                                   |
| `(shop)/carrito`                                               | `cart`                                                     |
| `(shop)/favoritos`                                             | `favorites`                                                |
| `(shop)/pedido/[number]`                                       | `order/[number]`                                           |
| `(shop)/asistente`                                             | `assistant`                                                |
| `(shop)/vista-previa`                                          | `preview`                                                  |
| `(marketing)/inicio`                                           | `home`                                                     |
| `(marketing)/contacto`                                         | `contact`                                                  |
| `(marketing)/privacidad`                                       | `privacy`                                                  |
| `(marketing)/terminos`                                         | `terms`                                                    |
| `registro`                                                     | `signup`                                                   |
| `pagos/simulado`                                               | `payments/simulated`                                       |
| `(platform)/plataforma`                                        | `platform`                                                 |
| `plataforma/tiendas`, `plataforma/pagos`, `plataforma/soporte` | `platform/stores`, `platform/payments`, `platform/support` |

`src/lib/marketing-host.ts` (el `reroute` por host) tiene `/inicio`,
`/terminos`, `/privacidad`, `/contacto`, `/registro` y `/plataforma` escritos a
mano: se cambian en la misma fase.

En `$lib`: `diseno.ts` → `design.ts`, `rubros.ts` → `industries.ts`,
`CobroWompiEstado.svelte` → `WompiChargeStatus.svelte`, y así con el resto
(inventario completo en la fase 1).

`ecommerce-api` tiene rutas del frontend escritas en el código. Se cambian en
un PR coordinado, desplegado junto con el del frontend:

| Archivo de la API                                     | Ruta                            |
| ----------------------------------------------------- | ------------------------------- |
| `modules/auth/providers/account.service.ts`           | `/admin/restablecer`            |
| `modules/team/providers/team.service.ts`              | `/admin/invitacion`             |
| `modules/platform/providers/subscriptions.service.ts` | `/admin/plan`                   |
| `modules/support/providers/support-notifier.ts`       | `/admin/soporte`, `/plataforma` |
| `modules/assistant/providers/store-tools.ts`          | `/tienda`                       |
| `shared/payments/` (`return-url`)                     | `/pedido`                       |

La de pagos es la delicada: si la API valida que la URL de retorno de Wompi
empiece por `/pedido`, rechazaría los pagos que vuelvan a `/order`. Se
despliega primero la API aceptando las dos rutas, después el frontend, y al
final se quita la vieja.

### 5. Imports por secciones con comentario

Hoy la regla 32 de `CLAUDE.md` (el orden de los grupos) no la valida ninguna
herramienta, y ya no se cumple: en `cupones/+page.svelte`,
`ConfirmDeleteDialog` y `DeleteConfirm` van antes que los tipos y los iconos.

Cada grupo lleva un comentario de encabezado, siempre en este orden y solo si
el grupo tiene imports:

```ts
// Tipos
import type { SubmitFunction } from '@sveltejs/kit';
import type { PageData } from './$types';

// Svelte
import { tick, untrack } from 'svelte';

// Librerías
import { z } from 'zod';

// Iconos
import ArrowLeft from '@lucide/svelte/icons/arrow-left';

// App
import { enhance } from '$app/forms';
import { page } from '$app/state';

// Componentes
import { Button } from '$lib/components/atoms/button';
import TextField from '$lib/components/molecules/TextField.svelte';
import AdminTemplate from '$lib/components/templates/AdminTemplate.svelte';

// Estado (stores y ViewModels)
import { DeleteConfirm } from '$lib/utils/delete-confirm.svelte';
import { DesignEditor } from './design-editor.svelte';

// Dominio
import { describeDesignChanges } from '$lib/domain/design-changes';

// Utilidades
import { cn } from '$lib/utils';
```

Cambios frente a la regla 32: los tipos de `./$types` suben al grupo `Tipos`;
los iconos salen de «librerías externas» porque en una página son muchos; los
ViewModels y stores tienen su sección. «Estado» cumple el papel de los hooks de
React: Svelte no tiene hooks, tiene clases con runes.

**Hecho en la fase 0.** Se valida con una regla propia,
`local/import-sections` (`eslint/import-sections.js`), en vez de
`eslint-plugin-perfectionist`: la sección sale de la ruta del import, así que
la regla también comprueba que cada import esté en la sección correcta y
`pnpm lint:fix` escribe los encabezados. Se agregaron dos secciones más:
`// Servidor` (`$lib/server/*`) y `// Recursos` (`$lib/assets/*`, CSS).

## Estado (rama `refactor/panel`)

| Fase                   | Estado                                                                                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 · Preparación        | Hecha, salvo el puente de tokens: espera a `@glob-ui/svelte` publicado.                                                                                                                                  |
| 1 · Nombres en inglés  | Hecha: rutas, URLs, actions, archivos e identificadores, con 308 en `legacy-routes.ts`. API: rama `refactor/english-routes`.                                                                             |
| 2 · Cascarón del panel | Bloqueada: espera a `@glob-ui/svelte`.                                                                                                                                                                   |
| 3 · Formularios        | Hecha: `parseForm`, `FormState`, `FormField`, `FormSection`. Quedan actions con preparación propia (productos, colecciones, diseño, ajustes, carrito) para cuando sus esquemas absorban esa preparación. |
| 4 · Templates          | `AuthTemplate` hecho. El resto espera a GlobUI.                                                                                                                                                          |
| 5 · ViewModels         | Hechos: `DesignEditor` (+ `HighlightsEditor`), `CouponDraft`, `CollectionDraft`, `ShippingEditor`, sobre `StorefrontPreview`. Productos no lo necesita (≤ 3 `$state`).                                   |
| 6 · Resto              | Layouts locales `AuthLayout`, `CanvasLayout`, `SettingsLayout`. `SettingsLayout` se adopta con `SettingsTemplate` (fase 4).                                                                              |

## Fases

Cada fase es una rama y un PR, con los gates de `CLAUDE.md` en verde y
`e2e/panel.spec.ts` pasando. Ninguna cambia comportamiento salvo donde se dice.

### Fase 0 · Preparación

- En GlobUI: publicar `@glob-ui/svelte` (o `pnpm link` mientras tanto).
- Puente de tokens en `src/app.css`.
- Quitar `sveltekit-superforms` (no se usa; la fase 3 lo reemplaza con un
  helper de 30 líneas sobre zod).
- `CLAUDE.md`: niveles `layouts` y `templates`, regla de ViewModel, regla de
  nombres en inglés, decisión de URLs, y la regla 32 reescrita con las
  secciones comentadas.
- Regla `local/import-sections` y `pnpm lint:fix` sobre todo el repo, salvo
  las primitivas generadas de `src/lib/components/ui/`.

### Fase 1 · Nombres en inglés

Solo renombres, sin lógica. Un PR mecánico que se mergea rápido para no chocar
con otras ramas (empezar después de mergear `feat/preview-editable`).

- Carpetas del panel según el mapa; redirecciones 308 de las URLs viejas en
  `hooks.server.ts`.
- Nombres de actions (`?/crear` → `?/create`, `?/eliminar` → `?/delete`, …).
- Archivos y componentes de `$lib` en español.
- `$lib/config/admin-routes.ts`: un solo lugar con los `href` del panel (hoy
  están repetidos en el layout, los botones y los redirects).

### Fase 2 · Cascarón del panel

- `templates/AdminTemplate.svelte`: `AppShellLayout` con la marca, «Nuevo
  producto», el selector de tienda, la navegación y el pie de cuenta fijos.
  Expone `title`, `description`, `actions` y `children`.
- La navegación sale a `$lib/config/admin-nav.ts` (grupos, iconos, `ownerOnly`,
  contadores) y a un organism `AdminNav.svelte`.
- En el celular, la navegación pasa a `Sheet` (hoy es una fila con scroll
  horizontal de 17 enlaces).
- `(panel)/+layout.svelte` queda en ~30 líneas.

### Fase 3 · Primitivas de página y formularios

- `PageHeader` de GlobUI reemplaza los 23 encabezados a mano.
- Molecule `FormField` (label, control, ayuda, error, ids enlazados) y uso
  obligatorio de los `*Field` existentes: fuera los 28 `space-y-2`.
- `atoms/card` en vez de las 14 tarjetas a mano; un organism `FormSection`
  (título, descripción, contenido, pie con el submit).
- Cliente: `$lib/utils/enhance-form.svelte.ts`, una clase `FormState` con
  `pending`, `enhance` y `onSuccess(reset)`. Reemplaza los 33 callbacks.
- Servidor: `$lib/server/form.ts` con `parseForm(request, schema)` que lee el
  `FormData`, valida y devuelve `{ ok, data } | fail(400, { error, fields })`.
  Reemplaza los 53 `formData()` + `safeParse` + `fail` repetidos.

### Fase 4 · Templates por tipo de pantalla

| Template             | Layout                      | Páginas                                                                                    |
| -------------------- | --------------------------- | ------------------------------------------------------------------------------------------ |
| `ListPageTemplate`   | `PageLayout`                | orders, products, inventory, coupons, collections, catalogs, restock-alerts, support, team |
| `DetailPageTemplate` | `PageLayout` con `aside`    | orders/[id], products/[id], support/[ticketId]                                             |
| `SettingsTemplate`   | `SettingsLayout`            | settings, account, payments, plan, domain, shipping                                        |
| `PreviewTemplate`    | `PageLayout` + vista previa | hoy `LivePreviewLayout`: coupons, collections, shipping, … (7 páginas)                     |
| `EditorTemplate`     | `CanvasLayout`              | design                                                                                     |
| `AuthTemplate`       | `AuthLayout`                | login, forgot-password, reset-password, invitation                                         |

`ListPageTemplate` fija la barra de filtros (en `URLSearchParams`, regla 26),
la tabla, el estado vacío y la paginación; la página pasa columnas y datos.

### Fase 5 · ViewModels

En orden de dolor:

1. `design` (844 líneas) → `DesignEditor`, más `HighlightsEditor` para los
   mensajes. Meta: la vista bajo 300 líneas.
2. `products/[id]` y `products/new` → `ProductEditor` compartido.
3. `collections`, `coupons`, `shipping` → un ViewModel cada uno para el
   borrador que alimenta la vista previa.

Cada ViewModel con su `*.test.ts`.

### Fase 6 · Resto de la plataforma

`/plataforma`, la tienda pública y el marketing, con los mismos templates y
sus URLs en inglés (mapa de la decisión 4), con 308, `sitemap.xml` y
`canonical` actualizados el mismo día.

## Orden de migración dentro de cada fase

Una pantalla piloto primero, para fijar el patrón antes de repetirlo:
**coupons** (lista + formulario + vista previa: toca casi todo). Después,
de más a menos usada: orders, products, inventory, collections, y el resto.

## Riesgos

- **Choque con ramas abiertas.** La fase 1 toca casi todos los archivos.
  Mergear o pausar lo que esté en curso antes.
- **GlobUI sin publicar.** Si `@glob-ui/svelte` no sale a npm, el deploy en
  Vercel no lo resuelve con `pnpm link`. Publicar es requisito de la fase 2.
- **Rutas escritas en la API.** Coordinar con `ecommerce-api` (fases 1 y 6);
  la URL de retorno de pagos va con despliegue en dos pasos.
- **SEO de la tienda.** Caída temporal al cambiar URLs indexadas; las 308 y el
  sitemap la acortan.
- **Regresiones visuales.** Comparar con capturas antes y después de cada
  pantalla (`pnpm capturas` ya existe para marketing; extenderlo al panel).
