# Plan: entrar y registrarse con Google

Estado: **Fase 1 (API) implementada en `ecommerce-api`, sin commit**; el resto,
planificado. Noviembre de 2026.

Alcance: cuentas de **dueñas y equipo** (`User` de la API): `/admin/login`,
`/signup` e invitaciones. Las clientas de las tiendas siguen comprando sin
cuenta; eso es otro proyecto.

Toca dos repositorios: `ecommerce-api` (identidad, vínculo, sesión) y
`shopping-sas` (redirección a Google, callback, botones). Este documento es el
plan de ambos.

---

## 1. Decisiones

| Tema                                 | Decisión                                                                                                                      | Por qué                                                                                                                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flujo                                | Authorization Code + PKCE, del lado del servidor. Sin el script de Google en el navegador.                                    | Funciona sin JavaScript, no abre la CSP y evita el `POST` cruzado de Google Identity Services, que el chequeo de origen de SvelteKit rechaza.                              |
| Quién habla con Google               | El frontend solo arma la URL (necesita el `client_id`). El canje del `code` y la verificación del `id_token` los hace la API. | El `client_secret` vive solo en la API (regla 16: la identidad la decide la API).                                                                                          |
| Callback                             | Uno solo, en el dominio raíz: `${PUBLIC_SITE_URL}/auth/google/callback`.                                                      | Google exige URIs registradas una por una; los subdominios de las tiendas no se pueden registrar. La cookie de sesión ya cruza a `*.globerce.com` (`sessionCookieDomain`). |
| Modelo                               | Tabla nueva `UserIdentity` (proveedor + `sub`), no una columna en `User`.                                                     | Deja la puerta a Apple u otros sin otra migración.                                                                                                                         |
| Cuenta existente con el mismo correo | Vínculo automático si Google manda `email_verified: true`.                                                                    | Elegido por el producto: sin fricción. Ver riesgo en §6.                                                                                                                   |
| Registro con Google                  | Dos pasos: Google da nombre y correo; la dueña completa tienda, subdominio, WhatsApp y plan.                                  | `register` necesita esos datos. No se crea un `User` sin tienda hasta que termina.                                                                                         |
| Cuenta solo-Google                   | `passwordHash = null` (el esquema ya lo permite). Login con contraseña responde "Esta cuenta entra con Google".               | —                                                                                                                                                                          |
| Bloqueo por intentos (`lockedUntil`) | Google entra aunque la cuenta esté bloqueada.                                                                                 | El bloqueo frena fuerza bruta de contraseña; Google ya probó la identidad.                                                                                                 |
| Logo de Google                       | Excepción a la regla 24: el SVG oficial de la "G" va en `$lib/assets/`, no como icono de lucide.                              | Las guías de marca de Google exigen su logo en el botón y lucide no trae iconos de marca.                                                                                  |

---

## 2. Contrato de la API (fijarlo primero)

Con esto cerrado, API y frontend avanzan en paralelo.

### `POST /auth/google`

Throttle 10/min por IP, como `login`.

```jsonc
// Pide
{ "code": "…", "codeVerifier": "…", "redirectUri": "https://globerce.com/auth/google/callback" }

// Responde 200, una de dos:
{ "status": "session", "session": { /* ApiSession, igual que /auth/login */ } }
{ "status": "signup_required", "signupToken": "…", "email": "…", "fullName": "…" | null }
```

Errores con la forma de siempre de la API: el código estable va en `error` y
el texto en español en `message` (`{ statusCode, message, error, … }`).

- `google_exchange_failed` (400): el `code` venció o ya se usó, el
  `codeVerifier` no corresponde, o el `id_token` no pasó la verificación.
- `google_redirect_uri_not_allowed` (400): `redirectUri` no está en
  `GOOGLE_REDIRECT_URIS`. No se llega a hablar con Google.
- `google_email_unverified` (403): Google no confirma el correo.
- `google_not_configured` (503): faltan `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET` o `GOOGLE_REDIRECT_URIS`.

`redirectUri` se compara contra una lista permitida en la API
(`GOOGLE_REDIRECT_URIS`), no se confía en lo que llegue. `codeVerifier` se
valida con el formato de RFC 7636 (43 a 128 caracteres `[A-Za-z0-9-._~]`): uno
con otro formato es un 400 de validación.

### `POST /auth/google/register`

Throttle 5/min, como `register`.

```jsonc
// Pide
{
	"signupToken": "…",
	"storeName": "…",
	"storeSlug": "…",
	"whatsappPhone": "…",
	"planCode": "…",
	"fullName": "…"
}
// Responde 201: ApiSession
```

`planCode` y `fullName` son opcionales. `fullName` reemplaza el nombre que dio
Google (sirve cuando Google no dio ninguno); sin él queda el de Google, o null.

`signupToken`: JWT de 15 minutos firmado con `JWT_SECRET` y `aud:
"google-signup"`, con `sub` de Google, correo y nombre. Errores:
`signup_token_invalid` (401), `email_taken` (409, alguien se registró con ese
correo entretanto, o esa cuenta de Google ya terminó su registro), `slug_taken`
(409).

### `POST /auth/login` (cambio)

Cuenta con `passwordHash = null` **y con Google vinculado** → 401 con
`error: "use_google"` y `message: "Esta cuenta entra con Google."`. Una cuenta
sin contraseña y sin Google (invitada que no terminó) sigue respondiendo el
genérico "Correo o contraseña incorrectos.".

### Fase 3: `POST /auth/invitations/accept-google`

```jsonc
{ "token": "…", "code": "…", "codeVerifier": "…", "redirectUri": "…" }
// 200: ApiSession, atada a la tienda de la invitación.
```

Throttle 10/min, como `invitations/accept`. Errores:

- `invitation_email_mismatch` (403): el correo de Google no es el invitado.
- `google_account_linked_elsewhere` (409): esa cuenta de Google ya está
  vinculada a una cuenta de Globerce con otro correo.
- Invitación vencida, revocada o ya aceptada: el mismo 400 de
  `invitations/accept`.
- Los errores de Google de `POST /auth/google`.

La cuenta se elige igual que en `/auth/google`: por identidad, luego por correo
(con las reglas del §6) y, si no hay ninguna, se crea sin contraseña. El
vínculo, la membresía y la invitación aceptada van en una sola transacción.

---

## 3. Fases y orden

```
Fase 0  Google Cloud (tú) ─────────────┐
Fase 1  API: identidad y endpoints ────┼──> Fase 3 Invitaciones ──> Fase 5 QA y despliegue
Fase 2  Front: redirección y botones ──┘    Fase 4 Cuenta (opcional)
```

Fases 0, 1 y 2 van en paralelo una vez cerrado el §2. La 3 necesita 1 y 2. La 4
es independiente y se puede dejar para después.

### Fase 0 — Google Cloud Console (tú, manual)

1. Proyecto `Globerce` en Google Cloud.
2. Pantalla de consentimiento OAuth: tipo **External**, nombre Globerce, logo,
   correo de soporte, dominio autorizado `globerce.com`, enlaces a
   `/privacy` y `/terms` (ya existen en `(marketing)`).
3. Scopes: `openid`, `email`, `profile`. Son no sensibles: no piden revisión de
   seguridad, solo verificación de marca para mostrar el logo.
4. Credencial **OAuth client ID → Web application** con redirect URIs:
   - `http://localhost:5173/auth/google/callback`
   - `https://globerce.com/auth/google/callback`
   - la de staging, si hay.
5. Guardar `client_id` y `client_secret` en el gestor de secretos. Nunca en el
   repositorio.
6. Publicar la app ("In production") antes de la Fase 5; en "Testing" solo
   entran los correos de prueba.

### Fase 1 — `ecommerce-api`

1. **Env** (`src/shared/config/env.ts`): `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URIS` (lista separada por comas),
   todos opcionales; sin ellos el endpoint responde `google_not_configured`.
2. **Prisma**: modelo y migración.

   ```prisma
   model UserIdentity {
     id              String   @id @default(uuid()) @db.Uuid
     userId          String   @map("user_id") @db.Uuid
     provider        String   // "google"
     providerSubject String   @map("provider_subject") // `sub` de Google
     email           String   // correo que dio el proveedor al vincular
     createdAt       DateTime @default(now()) @map("created_at")
     user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

     @@unique([provider, providerSubject])
     @@index([userId])
     @@map("user_identities")
   }
   ```

   Y en `User`: `identities UserIdentity[]` y `emailVerifiedAt DateTime?`
   (ver §6).

3. **`GoogleAuthService`** (`src/modules/auth/providers/google-auth.service.ts`),
   con `google-auth-library`:
   - `exchange(code, codeVerifier, redirectUri)` → `id_token`.
   - `verify(idToken)`: firma, `aud = GOOGLE_CLIENT_ID`, `iss`, `exp`,
     `email_verified`.
4. **`AuthService.signInWithGoogle`**:
   1. Identidad por `(google, sub)` → `sessionFor(user, primera tienda)`.
   2. Si no, `User` por correo (normalizado como en `login`) → crear
      `UserIdentity`, aplicar §6, revocar sus otros refresh tokens, avisar por
      correo ("Se conectó Google a tu cuenta") → sesión.
   3. Si no, emitir `signupToken`.
      La elección de tienda activa repite la de `login`.
5. **`AuthService.registerWithGoogle`**: verifica `signupToken`, reusa
   `registerStore` con `passwordHash: null` y crea la `UserIdentity` en la misma
   transacción.
6. **`login`**: respuesta `use_google` para cuentas sin contraseña.
7. **Controller + DTOs + Swagger** para `POST /auth/google` y
   `/auth/google/register`.
8. **Pruebas**: unitarias del servicio (los tres caminos, correo no
   verificado, token de registro vencido, `redirectUri` no permitida) y e2e con
   el endpoint de tokens de Google simulado.

### Fase 2 — `shopping-sas`

1. **Env** (`src/lib/server/env.ts`): `GOOGLE_CLIENT_ID` privado y opcional.
   Sin él no se pinta el botón.
2. **Cliente** (`$lib/server/api/auth.ts`): `signInWithGoogle` y
   `registerWithGoogle`, con zod. La respuesta de `/auth/google` como
   `z.discriminatedUnion('status', …)`.
3. **`$lib/server/google-oauth.ts`**:
   - `authorizationUrl({ state, codeChallenge, redirectUri })`.
   - PKCE: `code_verifier` aleatorio y `code_challenge` S256 (`node:crypto`).
   - Cookie `globerce_oauth`: sellada con `SESSION_SECRET` (reusa
     `session-crypto.ts`), `httpOnly`, `SameSite=Lax`, 10 minutos, con `state`,
     `codeVerifier`, `intent` (`login` | `signup` | `invitation`),
     `redirectTo` y `returnHost`.
   - `returnHost` solo se acepta si es el dominio raíz, un subdominio de
     `STORE_ROOT_DOMAIN` o un `PUBLIC_PLATFORM_HOSTS`. `redirectTo` pasa por
     `safeRedirectTarget`. Si no, al dominio raíz.
4. **Rutas** (inglés, regla 33):
   - `src/routes/auth/google/+server.ts` (`GET`): valida parámetros, escribe la
     cookie y redirige 303 a Google. Desde un subdominio, el botón apunta al
     dominio raíz con `returnHost`.
   - `src/routes/auth/google/callback/+server.ts` (`GET`): compara `state`,
     borra la cookie, llama `signInWithGoogle` y:
     - `session` → misma lógica que `admin/login` (tienda del host,
       `switchStore`, plataforma, sin acceso) → `writeSession` → redirige a
       `returnHost` + `redirectTo`.
     - `signup_required` → guarda `signupToken`, correo y nombre en la cookie
       sellada `globerce_google_signup` (15 min) → `/signup?with=google`.
     - Error o `error=access_denied` de Google → vuelve al origen con
       `?error=google` y el mensaje en un toast/notice.
   - La lógica de "después de tener sesión" de `admin/login/+page.server.ts`
     se extrae a una función compartida (`$lib/server/auth.ts`) para no
     duplicarla en el callback.
5. **UI** (atomic design, regla 21):
   - Recurso: `$lib/assets/google-g.svg` (logo oficial).
   - Molécula `GoogleSignInButton`: un `<a href>` a `/auth/google`, sin
     JavaScript, textos "Continuar con Google" / "Registrarte con Google".
   - Molécula `AuthDivider` ("o con tu correo"), si no existe algo igual.
   - `/admin/login`: botón arriba del formulario.
   - `/signup`: botón arriba. Con `?with=google` y la cookie viva: nombre y
     correo prellenados y de solo lectura, sin campos de contraseña; el action
     llama `registerWithGoogle`. Schema nuevo en `$lib/schemas/account.ts`.
   - Mensajes `use_google` y `google_email_unverified` en español en el notice
     del login.
6. **Pruebas** (vitest): sellado de la cookie, validación de `returnHost` y
   `redirectTo`, `state` distinto → rechazo, ramas del callback con la API
   simulada.

### Fase 3 — Invitaciones (ambos)

- API: `POST /auth/invitations/accept-google` (§2).
- Front: en `/admin/invitation`, botón "Aceptar con Google" con
  `intent=invitation` y el token de la invitación en la cookie `globerce_oauth`.
  El callback llama `accept-google` en vez de `/auth/google`.

### Fase 4 — Cuenta (opcional, después)

- Ver y desconectar Google desde la configuración de la cuenta. No se deja
  desconectar si la cuenta no tiene contraseña.
- "Crear contraseña" para cuentas solo-Google: `changePassword` sin
  `currentPassword` cuando `passwordHash` es null. Mientras tanto,
  "¿Olvidaste tu contraseña?" ya sirve para fijarla.

### Fase 5 — QA y despliegue

- Variables en producción (API y front) y redirect URI de producción en Google.
- Recorrido manual: login nuevo, login vinculado, registro con Google,
  subdominio de tienda, invitación, cancelar en Google, cuenta solo-Google con
  contraseña.
- Gates de ambos repos (`pnpm check`, `lint`, `format:check`, `test`, `build`;
  en la API `typecheck`, `test`, `test:e2e`).
- Publicar la app OAuth.

---

## 4. Variables de entorno

| Repo  | Variable               | Ejemplo                                                                                |
| ----- | ---------------------- | -------------------------------------------------------------------------------------- |
| API   | `GOOGLE_CLIENT_ID`     | `123….apps.googleusercontent.com`                                                      |
| API   | `GOOGLE_CLIENT_SECRET` | secreto                                                                                |
| API   | `GOOGLE_REDIRECT_URIS` | `http://localhost:5173/auth/google/callback,https://globerce.com/auth/google/callback` |
| Front | `GOOGLE_CLIENT_ID`     | el mismo `client_id` (no es secreto, pero solo lo usa el servidor)                     |

---

## 5. Fuera de alcance

- Cuentas de clientas en las tiendas.
- One Tap y el script de Google en el navegador.
- Dominios propios de las tiendas: el botón en un dominio propio manda al login
  del dominio raíz. La cookie no cruza a dominios que no son nuestros.

---

## 6. Riesgo del vínculo automático y cómo se cierra

Hoy no se verifica el correo al registrarse. Alguien podría abrir una tienda con
el correo de otra persona y una contraseña suya; cuando la dueña real entre con
Google, quedaría vinculada a una cuenta cuya contraseña conoce un tercero.

Medidas:

1. `User.emailVerifiedAt`: se fija al restablecer contraseña, al aceptar una
   invitación (los dos prueban el correo) y al entrar con Google.
2. Al vincular Google a una cuenta con `emailVerifiedAt = null`, se borra su
   `passwordHash` y se revocan todas sus sesiones. Si la dueña usaba
   contraseña, la recupera con "¿Olvidaste tu contraseña?".
3. Correo de aviso en cada vínculo.

---

## 7. Preguntas abiertas

- ¿Hay staging con dominio propio para registrar su redirect URI?
- ¿Las cuentas existentes de antes de este cambio tienen el correo probado?
  Si sí (por ejemplo, todas vinieron de invitaciones o de soporte), se puede
  llenar `emailVerifiedAt` en la migración y evitar que pierdan la contraseña
  en el primer vínculo.
