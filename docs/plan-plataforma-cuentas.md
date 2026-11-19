# Plan: cuentas y borrado de tiendas en la consola de la plataforma

Quien administra la plataforma (`platform_admins`) necesita ver todas las cuentas,
deshabilitarlas, eliminarlas y eliminar tiendas. Hoy `/platform` solo lista
tiendas, cambia plan, registra pagos y suspende/activa.

## Decisiones

- **Eliminar tienda = borrado definitivo.** Solo si la tienda ya está
  `SUSPENDED` y se escribe su slug para confirmar. Se borran sus filas (la base
  ya tiene `onDelete: Cascade` desde `stores`) y sus fotos del almacenamiento.
  Se pierde el historial de pagos de la suscripción.
- **Eliminar cuenta arrastra las tiendas donde es la única dueña.** La
  confirmación lista esas tiendas; la API exige que la lista que manda el panel
  coincida exactamente con la que calcula ella (evita borrar de más si alguien
  cambió roles entre ver y confirmar).
- **Nadie se deshabilita ni se elimina a sí mismo, ni a otra cuenta de
  `platform_admins`.** 403 con mensaje.

## API (`ecommerce-api`)

### Esquema

- `users.disabled_at timestamptz null`. Null = activa.

### Cortar el acceso de una cuenta deshabilitada

El access token dura `JWT_ACCESS_TTL` (15 min) y `JwtStrategy` no consulta la
base, a propósito. Por eso:

1. Al deshabilitar se revocan todos sus refresh tokens.
2. `login`, entrar con Google, `refresh`, restablecer contraseña y aceptar
   invitación rechazan la cuenta: 403 «Esta cuenta está deshabilitada.
   Escríbenos si crees que es un error.»
3. `StoreRolesGuard` y `PlatformAdminGuard` ya consultan la base en cada
   petición: suman `disabledAt is null` a esa misma consulta. Así el panel se
   corta en la siguiente petición, sin esperar a que venza el token.
4. `/auth/me` y las rutas de la cuenta también lo verifican.

### Endpoints nuevos (todos bajo `@PlatformRoute()`)

| Método | Ruta                                         | Qué hace                                                                                                                                                |
| ------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/platform/users?q=&status=active\|disabled` | Hasta 200 cuentas: correo, nombre, creada, `disabledAt`, cómo entra (contraseña / Google), membresías (tienda + rol), si es admin de plataforma.        |
| GET    | `/platform/users/:userId`                    | Lo mismo para una, más `soleOwnerStores`: las tiendas que se borrarían con ella.                                                                        |
| PATCH  | `/platform/users/:userId/status`             | `{ disabled: boolean }`. Revoca refresh tokens al deshabilitar.                                                                                         |
| DELETE | `/platform/users/:userId`                    | `{ confirmEmail, deleteStoreIds }`. `deleteStoreIds` debe ser igual a `soleOwnerStores`; si no, 409. Borra esas tiendas y la cuenta en una transacción. |
| DELETE | `/platform/stores/:storeId`                  | `{ confirmSlug }`. 409 si la tienda no está suspendida.                                                                                                 |

### Borrar una tienda

1. Dentro de la transacción: juntar las rutas de fotos (`StoreSettings.logoStoragePath`,
   `Collection.heroStoragePath`, `ProductImage.storagePath` con sus variantes) y
   borrar la fila de `stores` (la cascada hace el resto).
2. Después del commit: `MediaStorage.remove(keys)`. Si falla, `logger.error`
   con el id de la tienda; la tienda ya no existe y los archivos huérfanos no
   rompen nada.
3. Si tenía dominio propio registrado en el proveedor, darlo de baja allá
   (revisar `src/shared/domains`).
4. Un solo servicio (`PlatformStoreDeletionService`) lo usan el borrado de
   tienda y el de cuenta.

### Pruebas

`test/platform.e2e-spec.ts`: listar y filtrar cuentas; deshabilitar corta
login, refresh y panel; no se puede consigo ni con otra admin; borrar tienda
activa da 409; borrar tienda suspendida con slug mal escrito da 400; borrar
cuenta con `deleteStoreIds` distinto a lo calculado da 409; borrar cuenta
dueña única borra la tienda y sus fotos.

## Frontend (`shopping-sas`)

- `$lib/domain/account.ts`: `PlatformUser`, `PlatformUserDetail`.
- `$lib/server/api/platform.ts`: `listUsers`, `getUser`, `setUserDisabled`,
  `deleteUser`, `deleteStore`, con esquemas zod.
- `$lib/schemas/platform.ts`: confirmaciones (`confirmEmail`, `confirmSlug`).
- `/platform/users`: listado con búsqueda y filtro de estado en
  `URLSearchParams` (patrón de `/platform/stores`).
- `/platform/users/[id]`: ficha con membresías y actions `?/disable`,
  `?/enable`, `?/delete`. El borrado abre un diálogo que lista las tiendas que
  se van con la cuenta y pide escribir el correo.
- `/platform/stores/[id]`: action `?/delete`, visible solo si está suspendida,
  con diálogo que pide el slug. Tras borrar, `redirect` a `/platform/stores` y
  toast.
- `PlatformTemplate`: entrada «Cuentas» en la navegación.
- Una sesión del panel de una cuenta deshabilitada cae sola: `requireAdmin` ya
  verifica la membresía contra la API, que ahora responde 403.

## Orden

1. API en rama `feat/platform-users` desde `main`, con su PR.
2. Frontend en rama `feat/platform-users` desde `main`, contra la API ya
   desplegada.

## Fuera de alcance

- Registro de auditoría (quién deshabilitó o borró qué). Vale la pena después.
- Recuperar una tienda borrada.
