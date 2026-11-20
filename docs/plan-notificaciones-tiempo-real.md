# Tarea: avisos en tiempo real (panel de la tienda y consola de la plataforma)

Toca dos repos:

- `ecommerce-api` (NestJS + Prisma + Fastify). Lee `docs/ARCHITECTURE.md` y `docs/PENDIENTES.md`.
- `shopping-sas` (SvelteKit). Lee `CLAUDE.md` entero.

Rama `feat/realtime-notifications` en cada repo, saliendo de `main`. Un commit por
fase. Gates al final de cada fase:

- API: `pnpm typecheck`, `pnpm lint:check`, `pnpm format:check`, `pnpm test`,
  `pnpm test:e2e`, `pnpm build`
- Front: `pnpm check`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build`

## Objetivo

- **Dueña y personal de una tienda:** se enteran al instante, dentro del panel, de
  cada pedido nuevo y de cada pedido pagado.
- **Administración de la plataforma:** se entera en `/platform` de cada tienda
  creada (y si la cuenta es nueva), de cada pago o cobro fallido de un plan y de
  cada caso de soporte nuevo o mensaje de una dueña.
- Nada se pierde: si nadie tenía la pestaña abierta, el aviso queda en la
  bandeja (campana con contador de no leídos).

## Decisiones tomadas (no se reabren)

1. **Bandeja guardada en la API** + **SSE servido por la API**. El navegador abre
   `EventSource` directo contra la API con un **ticket corto** firmado que emite
   SvelteKit desde el servidor.
   Por qué: el front va a Vercel, donde una conexión abierta por pestaña
   mantiene una función viva y se corta por duración máxima. La API en EC2
   aguanta conexiones largas sin costo extra.
   Es una **excepción explícita a las reglas 11 y 16** de `CLAUDE.md`. Vale
   solo para este stream, que es de solo lectura y no lleva datos de clientas.
   Se anota en `CLAUDE.md` (fase 3).
2. **Web Push (avisos con el panel cerrado) es la fase 5**, no la primera.
3. Un evento produce un aviso y uno solo (mismas reglas de idempotencia que
   `plan-avisos-de-pedidos.md`).

## Reglas que no se negocian

1. El aviso nunca tumba la petición ni revierte nada. Se publica DESPUÉS de que la
   transacción se confirma, nunca dentro de `forStore(...)`. Si falla, va un
   `logger.warn` con ids y se sigue (patrón `SupportNotifier`).
2. **Cero datos de clientas en el aviso:** ni nombre, ni teléfono, ni correo, ni
   dirección. El aviso lleva ids, número de pedido, total, cantidad de productos
   y nombre de la tienda. El detalle se ve al abrir el enlace, dentro de la sesión.
3. Nada de datos personales en logs. Solo ids.
4. Idempotencia:
   - Una creación de pedido idempotente repetida (`previous` / `existing`) no avisa.
   - Un evento de pago reintentado sobre un pedido que ya está `PAID` no avisa.
   - Un pago parcial, `pending` o `failed` del pedido no avisa.
   - Un evento de suscripción repetido no avisa dos veces.
5. Toda consulta por tienda pasa por `prisma.forStore` (RLS); respeta
   `tenant-scope.arch-spec.ts`. Nada de `any`, `as`, `@ts-ignore`, `console.log`
   ni `--no-verify`.
6. Textos en español de Colombia, tuteando. Precios `$89.900` (en el front con
   `formatMoney`).

## Fase 1 — API: bandeja y publicación

- [ ] Prisma:
  - `enum NotificationType`: `ORDER_PLACED`, `ORDER_PAID`, `STORE_CREATED`,
    `USER_REGISTERED`, `SUBSCRIPTION_PAID`, `SUBSCRIPTION_FAILED`,
    `SUPPORT_TICKET_OPENED`, `SUPPORT_OWNER_REPLIED`.
  - `model Notification`: `id` uuid, `userId` (destinataria), `storeId String?`
    (null = aviso de plataforma), `type`, `data Json` (solo lo permitido en la
    regla 2), `readAt DateTime?`, `createdAt`. Índices
    `(userId, storeId, createdAt desc)` y `(userId, readAt)`.
  - Una fila **por destinataria** (fan-out al crear): leído/no leído es por persona.
  - Migración `notifications` con `pnpm db:migrate`.
- [ ] `src/shared/notifications/notification-bus.ts`: clase abstracta
      `NotificationBus` (`publish(userId, dto)`, `subscribe(userId, handler) → unsubscribe`)
      e implementación `InMemoryNotificationBus` sobre `EventEmitter`. Hoy la API corre
      en una sola instancia. Si un día son dos, se cambia por una implementación
      sobre `LISTEN/NOTIFY` de Postgres sin tocar a nadie más. Anótalo en
      `ARCHITECTURE.md`.
- [ ] `src/modules/notifications/`: `NotificationsService`.
  - `notifyStore(storeId, event)`: destinatarias = todos los `StoreMember` de la
    tienda (OWNER y STAFF ven pedidos). Inserta con `forStore`.
  - `notifyPlatform(event)`: destinatarias = todas las filas de `PlatformAdmin`.
  - Después de insertar, `bus.publish` por cada destinataria. Nunca lanza.
- [ ] Lectura (con los guards que ya existen en cada superficie):
  - `GET /stores/:storeId/notifications?before=&limit=` → `{ items, unread }`
    del usuario de la sesión en esa tienda.
  - `POST /stores/:storeId/notifications/read` `{ ids?: string[] }` (sin ids =
    todas).
  - Lo mismo en `/platform/notifications` (`storeId: null`), solo para
    administración de la plataforma.
- [ ] DTO de salida único `NotificationDto`: `id`, `type`, `createdAt`, `readAt`,
      `data` tipado por `type` (unión discriminada en el DTO, validada al escribir).
- [ ] Tests: el fan-out crea una fila por miembro; la lectura no ve avisos de
      otra tienda ni de otra persona; `read` sin ids marca solo las del usuario.

## Fase 2 — API: disparadores

Todos después de la transacción, y vía `NotificationsService`:

- [ ] `ORDER_PLACED`: `checkout.service.ts` → `createOrder()` / `placeOrder()`.
      Que devuelvan si el pedido es nuevo (`{ order, created }`, igual que pide
      `plan-avisos-de-pedidos.md`, fase 2; si ese plan ya se hizo, reutiliza su
      señal y no la dupliques). `data`: `orderId`, `number`, `total`, `itemCount`,
      `paid`.
- [ ] `ORDER_PAID`: `order-payments.service.ts`, solo en la transición real a
      `PAID`. `data`: `orderId`, `number`, `total`.
- [ ] `STORE_CREATED` (plataforma): `auth.service.ts` → `registerStore()`,
      `registerWithGoogle()` (`newAccount: true`) y `createStore()`
      (`newAccount: false`). `data`: `storeId`, `storeName`, `slug`, `userId`,
      `newAccount`. Una cuenta nueva con tienda es UN aviso, no dos.
- [ ] `USER_REGISTERED` (plataforma): solo si existe un camino que crea una cuenta
      **sin** tienda (por ejemplo aceptar una invitación). Búscalo. Si no existe,
      deja el tipo sin usar y anótalo. `data`: `userId`.
- [ ] `SUBSCRIPTION_PAID` / `SUBSCRIPTION_FAILED` (plataforma):
      `subscriptions.service.ts` → `applyPayment()` y los fallos de `chargeDue()`.
      `data`: `storeId`, `storeName`, `amountCop`, `planCode`.
- [ ] `SUPPORT_TICKET_OPENED` / `SUPPORT_OWNER_REPLIED` (plataforma):
      `store-support.service.ts` → `create()` / `reply()`, en el mismo punto donde
      hoy se llama a `SupportNotifier.ownerWrote`. Sin el texto del mensaje.
      `data`: `ticketId`, `storeId`, `storeName`.
- [ ] Tests con `NotificationsService` falso: pedido nuevo 1 aviso, repetición
      idempotente 0; evento repetido sobre `PAID` 0; pago parcial 0; si el servicio
      lanza, la petición responde igual.

## Fase 3 — API: stream SSE con ticket

- [ ] Ticket:
  - `POST /stores/:storeId/notifications/stream-ticket` y
    `POST /platform/notifications/stream-ticket`, con la sesión normal.
  - Devuelven `{ url, ticket, expiresAt }`. JWT con `JWT_SECRET`,
    `aud: 'notifications-stream'`, `sub: userId`, `scope: 'store:<id>' | 'platform'`,
    TTL 60 s.
  - Un access token normal NO sirve como ticket, ni al revés: verifica `aud` en
    los dos lados.
- [ ] `GET /notifications/stream?ticket=&after=` (SSE, `text/event-stream`):
  - verifica el ticket y que la membresía (o `PlatformAdmin`) siga viva;
  - si viene `after` (id del último aviso visto), primero reenvía desde la base
    los avisos posteriores de esa persona y ese alcance (máximo 50);
  - luego se suscribe al bus. Cada aviso sale como `event: notification`,
    `id: <notification id>` y `data: <NotificationDto JSON>`;
  - latido `: ping` cada 25 s, `retry: 5000`, cierre a los 30 min (el cliente
    reconecta con un ticket nuevo);
  - al cerrar la conexión, se desuscribe (sin fugas: test).
- [ ] CORS de esta ruta: `Access-Control-Allow-Origin: *` **sin** credenciales. La
      autenticación es el ticket, no hay cookies. Así sirve en subdominios y
      dominios propios, que no están en `CORS_ORIGINS`.
- [ ] El logger de Fastify no registra el query string de esta ruta (el ticket
      no puede quedar en los logs).
- [ ] Revisa el proxy (Caddy) y la compresión (`@fastify/compress`): el stream
      no se comprime ni se bufferiza (`X-Accel-Buffering: no`,
      `Cache-Control: no-cache`).
- [ ] e2e: ticket de otra tienda → 403; ticket vencido → 401; access token como
      ticket → 401; un pedido nuevo llega por el stream a una dueña conectada.

## Fase 4 — Front: campana, bandeja y conexión en vivo

- [x] `$lib/domain/notifications.ts`:
  - `AppNotification` (unión discriminada por `type`);
  - `notificationText(n)` → `{ title, body }`, por ejemplo «Pedido #123 nuevo» /
    «$89.900 · 3 productos · Por pagar», o «Nueva tienda: Luna Boutique» /
    «Cuenta nueva»;
  - `notificationHref(n)` → `/admin/orders/{id}`, `/platform/stores/{id}`,
    `/platform/support/...`, `/platform/payments`.
- [x] `$lib/server/api/panel-notifications.ts` y
      `$lib/server/api/platform-notifications.ts`: listar, marcar leídas y pedir
      ticket. Leído con zod y traducido a `$lib/domain/notifications.ts`.
- [x] Layouts `(panel)/+layout.server.ts` y `(platform)/platform/+layout.server.ts`:
      devuelven `notifications: { items, unread, stream }`. Como el contador
      pendiente, es un extra: si falla, el panel se muestra igual.
- [x] Ticket renovado: `src/routes/(admin)/admin/notifications/ticket/+server.ts`
      y su par en `/platform`, `GET`, que llama a la API y devuelve
      `{ url, ticket }`. El navegador le pide el ticket a **su propio servidor**,
      nunca a la API. Pasa por `requireAdmin` / `requirePlatformAdmin`.
- [x] ViewModel `$lib/components/organisms/notification-center.svelte.ts` (clase
      con runes, con prueba): `items`, `unread`, `status`
      (`connecting | live | offline`).
  - `connect()` abre `EventSource(url + '?ticket=…&after=<último id>')`.
  - `onNotification` agrega al inicio sin duplicar por `id`, sube el contador y
    lanza un toast (`svelte-sonner`) con «Ver» → `notificationHref`.
  - Ante un error: cierra, espera con backoff (2 s, 5 s, 15 s, máx. 60 s), pide
    ticket nuevo y reabre.
  - Pausa al ocultar la pestaña más de 5 min. Al volver, reconecta con `after`.
- [x] Organismo `NotificationCenter.svelte`: botón campana (`Bell` de lucide)
      con insignia de no leídos y un popover con los últimos 20 avisos (los no
      leídos, resaltados). Al pie, «Marcar todo como leído» y «Ver todos». El
      `$effect` que abre y cierra el `EventSource` vive aquí (efecto real:
      suscripción).
  - Va en la barra de `AdminTemplate` y de `PlatformTemplate`.
  - Si `status === 'offline'`, un punto gris con el texto «Sin conexión en vivo».
  - El título de la pestaña lleva `(N)` mientras haya no leídos.
- [x] Páginas `/admin/notifications` y `/platform/notifications`: listado
      paginado por `URLSearchParams` (`?before=`), con form actions `?/read`
      (`id`) y `?/readAll` con `use:enhance`. Botón deshabilitado mientras envía.
      Al abrir un aviso desde la campana, se marca leído por form action.
- [x] `CLAUDE.md`, reglas 11 y 16: añade la excepción «salvo el stream de avisos
      (`EventSource` contra la API con ticket de 60 s), ver
      `docs/plan-notificaciones-tiempo-real.md`».
- Hecho distinto a lo planeado:
  - El ticket se pide por `POST` (no `GET`): emite una credencial y no debe
    quedar en cachés ni precargarse.
  - El ViewModel vive en `$lib/stores/notification-center.svelte.ts` y la
    conexión a la página (toast, `visibilitychange`) en
    `$lib/stores/live-notifications.svelte.ts`. El organismo se llama
    `NotificationBell` y no conecta nada: el template crea un solo centro,
    porque el panel pinta la campana dos veces (barra y celular).
  - Lo que la API reenvía al reconectar llega como `event: missed` y no lanza
    toast; lo nuevo llega como `event: notification`.
  - El listado completo es el organismo `NotificationFeed`.
  - El `(N)` en el título de la pestaña no se hizo: cada página pone su
    `<title>` y pelearían por él.
  - El «Ver» del toast navega sin marcar leído (no es un formulario).
- [ ] Prueba manual: dos navegadores, uno en el panel y otro comprando. El aviso
      llega en menos de 2 s. Corta la red 1 min, haz otro pedido y vuelve: el aviso
      aparece al reconectar y no se duplica.

## Fase 5 — Web Push (avisos con el panel cerrado)

- [ ] API: `model PushSubscription` (`userId`, `endpoint` único, `p256dh`,
      `auth`, `userAgent`, `createdAt`). Llaves `VAPID_PUBLIC_KEY`,
      `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` en `env.ts` (opcionales: sin ellas no se
      envía push). Dependencia `web-push`.
- [ ] `NotificationsService` también envía push a cada suscripción de la
      destinataria. Con 404/410 borra la suscripción. Nunca lanza. El push lleva
      solo `title`, `body` y `url` (regla 2).
- [ ] `POST/DELETE /me/push-subscriptions`.
- [ ] Front: `src/service-worker.ts` (eventos `push` y `notificationclick`, que
      abre o enfoca `url`) y `static/manifest.webmanifest` (en iPhone solo hay push
      con la web instalada en la pantalla de inicio).
- [ ] Activar se hace a mano: en la bandeja, «Avisarme en este dispositivo»
      pide el permiso solo al pulsarlo, nunca al cargar. La suscripción llega al
      servidor por form action.
- [ ] Explica en la interfaz el caso de iPhone: «Para recibir avisos en iPhone,
      agrega Globerce a tu pantalla de inicio».

## Fuera de alcance (no lo hagas)

Avisos por correo (ya los cubre `plan-avisos-de-pedidos.md`), WhatsApp o SMS,
preferencias por tipo de aviso, sonidos, varias instancias de la API (el bus
queda listo para cambiarlo), alertas de reposición.
