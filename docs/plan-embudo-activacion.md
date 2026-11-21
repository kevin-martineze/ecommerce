# Plan: embudo de activación en la consola de la plataforma

Estado: **planificado, sin implementar**. 21 de noviembre de 2026.

Toca dos repositorios: `ecommerce-api` (calcula la etapa de cada tienda) y
`shopping-sas` (la pinta en `/platform`). Este documento es el plan de ambos.

---

## 0. Para qué

Hoy `/platform/stores` solo muestra `productos / pedidos`. Con 10 tiendas en
prueba no se sabe cuál se quedó trabada, en qué paso ni desde cuándo. El
objetivo es que la consola responda tres preguntas:

1. ¿En qué paso va cada tienda y hace cuántos días que no avanza?
2. ¿Cuántas tiendas llegan a cada paso? (dónde se cae el embudo)
3. ¿A quién le escribo hoy para ayudarle? (botón directo a su WhatsApp)

No se agrega tracking nuevo ni tablas nuevas: todo sale de datos que ya
existen. Sin migraciones de Prisma.

---

## 1. Etapas

Lineales y acumulativas: una tienda está en la etapa más alta que alcanzó.

| Código        | Etiqueta (es-CO) | Se alcanza cuando                                              | Fecha que la marca                                 |
| ------------- | ---------------- | -------------------------------------------------------------- | -------------------------------------------------- |
| `created`     | Recién creada    | La tienda existe.                                              | `Store.createdAt`                                  |
| `catalog`     | Con catálogo     | Tiene al menos un producto `ACTIVE` con al menos una foto.     | `min(Product.createdAt)` de esos productos         |
| `first_order` | Primer pedido    | Tiene al menos un pedido que no está `CANCELLED`.              | `min(Order.createdAt)` de esos pedidos             |
| `first_sale`  | Primera venta    | Tiene un pedido `paymentStatus = PAID` o `status = DELIVERED`. | `min(coalesce(paidAt, updatedAt))` de esos pedidos |
| `paying`      | Paga Globerce    | Tiene al menos un `Payment` registrado (paga su plan).         | `min(Payment.createdAt)`                           |

Reglas:

- Si se cumple una etapa alta sin la anterior (p. ej. un pago manual sin
  pedidos), la etapa es la más alta cumplida. Las fechas que falten quedan en
  `null`.
- **Días sin avanzar** = días enteros (zona `America/Bogota`) desde la fecha de
  la etapa actual hasta hoy. En `paying` no se muestra.
- Las fechas se calculan en cada lectura, no se guardan: si la tienda archiva
  su único producto con foto, vuelve a `created`. Es aceptado: la consola es
  para decidir a quién ayudar, no un registro contable.

Además de la etapa, una lista de control que no ordena el embudo:

- `hasLogo`: `StoreSettings.logoUrl` no es null o `StoreSettings.theme` no es null.
- `wompiConnected`: existe `StorePaymentAccount` con `active = true`.
- `activeProductsWithPhoto`: cuántos productos `ACTIVE` tienen foto.
- `lastSeenAt`: el `createdAt` más reciente de `RefreshToken` de cualquier
  miembro de la tienda con `storeId` = esa tienda. Cada renovación de sesión
  crea uno, así que es "última vez que alguien usó el panel", con la precisión
  de la vida del access token. Null si nunca.
- `contactPhone`: `StoreSettings.whatsappPhone` (el número al que la tienda
  vende, que en la práctica es el de la dueña). Null si está vacío.

---

## 2. `ecommerce-api`

Rama: `feat/embudo-activacion`, desde `main`.

### 2.1 Cálculo

Archivo nuevo `src/modules/platform/providers/activation.ts`:

- `ACTIVATION_STAGES = ['created', 'catalog', 'first_order', 'first_sale', 'paying'] as const`
  y su tipo `ActivationStage`.
- `interface ActivationMilestones { createdAt; firstProductAt; firstOrderAt; firstSaleAt; firstPaymentAt }`
  (todas `Date | null` salvo `createdAt`).
- `activationStage(m: ActivationMilestones): ActivationStage`: **pura**, la
  más alta cumplida.
- `stageReachedAt(m, stage): Date`: la fecha de la etapa actual.
- `readActivation(tx, storeId): Promise<StoreActivationDto>`: hace las
  consultas. Recibe el `tx` de `prisma.forStore(storeId, …)` porque
  `products`, `orders`, `payments` están bajo RLS (ver la nota de
  `PlatformService`). Antes de escribirla, revisar en las migraciones qué
  tablas tienen RLS (`store_settings`, `store_payment_accounts`,
  `refresh_tokens`) y leer cada una con el cliente que corresponda: dentro de
  `forStore` las que están bajo RLS, con `this.prisma` las que no.
- Usar `aggregate`/`findFirst` con `orderBy` y `select` mínimos; nada de
  traer filas completas.

Prueba unitaria `activation.spec.ts` con `activationStage` (cada etapa, saltos
de etapa, todo null) y el cálculo de días si vive aquí.

### 2.2 DTO y servicio

- `src/shared/dtos/platform/platform.dto.ts`: `StoreActivationDto` con
  `stage`, `stageReachedAt`, `firstProductAt`, `firstOrderAt`, `firstSaleAt`,
  `firstPaymentAt`, `lastSeenAt`, `activeProductsWithPhoto`, `hasLogo`,
  `wompiConnected`, `contactPhone`. Se agrega como `activation` a
  `PlatformStoreDto` (lo hereda el detalle). Decoradores de Swagger como los
  demás campos del archivo.
- `PlatformService.tenantSummary` y `getStore` añaden `activation`.
  `toStoreDto` lo copia.
- `PlatformStoreListQueryDto`: nuevo `stage?: ActivationStage` (`IsIn`).
  Filtra igual que `overdue`, después de calcular el resumen.
- `PlatformDashboardService.dashboard`: nuevo campo `activation` en
  `PlatformDashboardDto` con, por etapa, cuántas tiendas la **alcanzaron**
  (acumulado: una tienda en `first_sale` cuenta también en `catalog` y
  `first_order`). Forma: `{ created: n, catalog: n, firstOrder: n, firstSale: n, paying: n }`.
  Reutiliza `readActivation`; no dupliques consultas.

### 2.3 Pruebas

- Unitarias de `activation.ts`.
- `test/platform.e2e-spec.ts`: el listado trae `activation` con la etapa
  correcta para una tienda sin productos y otra con producto activo con foto y
  un pedido; `?stage=catalog` filtra; el dashboard trae los conteos
  acumulados.
- Gates del repo (`package.json`): lint, typecheck, test, e2e si corren local.

---

## 3. `shopping-sas`

Rama: `feat/embudo-activacion`, desde `main`. Seguir `CLAUDE.md` al pie de la
letra (secciones de imports, sin `as`, runes, átomos, tokens, textos es-CO).

### 3.1 Dominio y cliente

- `src/lib/domain/activation.ts`: `ACTIVATION_STAGES`, `ActivationStage`,
  `ACTIVATION_STAGE_LABEL: Record<ActivationStage, string>` (etiquetas de la
  tabla de arriba), `interface StoreActivation` en snake_case como el resto de
  `$lib/domain/account.ts`, y `daysSince(iso: string, now: Date): number`
  (días enteros en Bogotá). Prueba `activation.test.ts`.
- `src/lib/domain/account.ts`: `PlatformStore.activation: StoreActivation`;
  `PlatformDashboard.activation: Record<ActivationStage, number>`.
- `src/lib/server/api/platform.ts`: esquema zod de `activation` dentro de
  `storeFields` y traducción en `toStore`; `StoreFilters.stage` que escribe
  `?stage=`; el esquema del dashboard (buscarlo en este archivo) suma
  `activation`, traducido de `firstOrder` → `first_order`, etc.
- `src/lib/schemas/platform.ts`: `storeFilterStageSchema = z.enum(ACTIVATION_STAGES)`.

### 3.2 Pantallas

**`/platform/stores`** (`+page.server.ts`, `+page.svelte`):

- Lee `stage` de la URL con `storeFilterStageSchema.safeParse`, como `status`.
- Filtro "Etapa" que escribe `?stage=` directo en la URL, igual que el de
  estado (ver commit `67cdd90`). Nada de `$state` para el filtro (regla 26).
- Columna nueva "Va en": `Badge` (átomo) con la etapa y debajo, en
  `text-muted-foreground text-xs`, "hace N días" (oculto en `paying`).
  Si `last_seen_at` tiene más de 7 días, un aviso discreto "Sin entrar hace N días".

**`/platform/stores/[id]`**:

- Tarjeta "Activación": lista de las cinco etapas con icono de lucide
  (`circle-check` cumplida, `circle` pendiente), su fecha formateada en
  es-CO/Bogotá o "Todavía no". Debajo la lista de control: logo, Wompi,
  productos activos con foto, última vez en el panel.
- Botón "Escribirle por WhatsApp" si hay `contact_phone`: enlace
  `https://wa.me/<solo dígitos>` con `target="_blank" rel="noopener"`, sin
  texto prellenado. Icono `message-circle`. Color `bg-whatsapp` si el átomo
  lo permite.

**`/platform`** (dashboard):

- Tarjeta "Embudo de activación": una fila por etapa con etiqueta, número,
  porcentaje sobre `created` y una barra proporcional (ancho por `style`
  calculado con `$derived`; los colores con tokens). Cada fila enlaza a
  `/platform/stores?stage=<código>`.

### 3.3 Pruebas y gates

- `activation.test.ts` del dominio.
- Prueba del esquema en `src/lib/server/api/` si existe una equivalente para
  `platform.ts`; si no, una nueva que parsee una respuesta de ejemplo.
- `pnpm check`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build`.

---

## 4. Orden y entrega

1. API: implementar, gates, commit, PR a `main`.
2. Frontend: implementar contra la rama de la API corriendo local, gates,
   commit, PR a `main`.
3. Se despliega **primero la API**: el frontend exige `activation` en el
   esquema y, sin él, `/platform/stores` falla.

Commits en español con el estilo del repo (`feat(platform): …`). Sin
`--no-verify`. Sin worktrees: ramas en los checkouts existentes.

## 5. Fuera de alcance

- Registrar visitas a la tienda pública o si la dueña compartió el enlace (no
  hay dato; sería tracking nuevo).
- Entrar al panel como la dueña.
- Mensajes automáticos a las tiendas trabadas.
- La cuenta de Wompi de la plataforma (rama `feat/avisos-pedidos-cuenta-plataforma`
  de la API, sin fusionar): `wompiConnected` solo mira `StorePaymentAccount`.
