# Sesión RVD con cookie opaca (BFF)

Cómo quedó el SSO después de sacar el JWT del navegador.
Complementa `docs/SEGURIDAD-BACKEND-FRONTEND-RVD.md` (identidad + roles +
funcionalidades) y reemplaza el flujo Bearer descrito en
`docs/IMPLEMENTACION-AUTH-PERMISOS-FRONTEND.md`.

Aplicación Vortal: **55100** (RVD).

---

## Idea en una frase

El JWT de SecurityAuth se entrega **una sola vez** a RVD. El servidor lo
guarda y al navegador solo le llega una cookie HttpOnly (`RVD_SESSION`)
más datos de usuario y CSRF. Angular **no** decodifica JWT, **no** guarda
`accessToken` y **no** llama a SecurityAuth.

---

## Por qué cambió

Antes el SPA hacía de cliente OAuth:

1. Guardaba el JWT en `localStorage` / `sessionStorage`.
2. El interceptor ponía `Authorization: Bearer`.
3. El menú se pedía directo a SecurityAuth
   (`GET /funcionalidad/arbol-roles`) con ese Bearer.

Eso expone el token a XSS y obliga al front a conocer el issuer. El BFF
deja el JWT solo en el servidor (`OpaqueSessionStore`, Caffeine, TTL =
`exp` del JWT).

El JWT **sigue sin traer el árbol**. Solo identidad y roles por
aplicación. El menú sale de SecurityAuth; ahora lo pide **RVD**, no
Angular.

---

## Contrato de sesión

| Método | Ruta | Quién | Qué hace |
| --- | --- | --- | --- |
| `POST` | `/rvd/api/auth/bootstrap` | público (sin cookie) | Recibe `{ accessToken }`, valida RS256, guarda JWT, responde `Set-Cookie` + body **sin** token |
| `GET` | `/rvd/api/auth/me` | cookie | Restaura usuario + CSRF al recargar |
| `GET` | `/rvd/api/auth/csrf` | cookie | `{ headerName, token }` para reintentar CSRF |
| `GET` | `/rvd/api/auth/menu` | cookie | RVD llama a SecurityAuth `/funcionalidad/arbol-roles` con el JWT del store y devuelve el JSON tal cual |
| `POST` | `/rvd/api/auth/logout` | cookie; CSRF exento | Revoca la sesión y borra la cookie (204) |

### Cookie de sesión

```http
Set-Cookie: RVD_SESSION=<id aleatorio>; HttpOnly; Secure; SameSite=Lax; Path=/rvd
```

- Local (`http://`): `Secure=false` en `rvd.security.session`.
- Producción (`https://`): `Secure=true`, `allow-bearer: false`.
- Path `/rvd`: la cookie viaja a `http://localhost:8080/rvd/...`.

### Body de bootstrap / me (sin tokens)

```json
{
  "username": "pmduran",
  "nombreCompleto": "PEPE MANCO DURAN NO",
  "idPersona": "231326",
  "roles": ["ADMIN RVD-UDEC", "Coordinador"],
  "usuario": {
    "username": "pmduran",
    "nombreCompleto": "PEPE MANCO DURAN NO",
    "idPersona": 231326,
    "roles": ["ADMIN RVD-UDEC", "Coordinador"],
    "idAplicacion": 55100
  },
  "expiresAt": "2026-09-23T22:59:50Z",
  "csrfHeaderName": "X-XSRF-TOKEN",
  "csrfToken": "…"
}
```

`GET /me` debe rellenar también `expiresAt` (hoy bootstrap sí, `/me`
puede devolver `null`).

---

## Cadena de seguridad en RVD

1. `CookieBearerTokenResolver`: cookie `RVD_SESSION` → store → JWT.
   Con `allow-bearer: true` (solo dev) acepta `Authorization: Bearer` si
   **no** hay cookie.
2. Decoder, converter y permisos `METHOD:URL` no cambian.
3. CSRF double submit: cookie `XSRF-TOKEN` + header `X-XSRF-TOKEN`.
   Solo en `POST` / `PUT` / `PATCH` / `DELETE` que traen `RVD_SESSION`.
   `bootstrap` y `logout` están exentos.
4. CORS: `allowCredentials(true)` y header permitido `X-XSRF-TOKEN`.
   Orígenes: `localhost:4200`, `127.0.0.1:4200`,
   `dev-especifico.unipamplona.edu.co`.

Config: `rvd.security.session` (`cookie-name`, `secure`, `same-site`,
`allow-bearer`, `default-ttl`).

---

## Qué hace el frontend

### 1. Ya no maneja el JWT

Eliminado:

- `localStorage` / `sessionStorage` del `accessToken` (`StorageService`).
- Interceptor `Authorization: Bearer` (`auth.interceptor.ts`).
- Llamadas a SecurityAuth (`/funcionalidad/arbol-roles`, proxy
  `/security-auth`).
- `jwt-decode`. Los datos salen de `/bootstrap` y `/me`.

### 2. `AuthService` (sesión en memoria)

Archivo: `src/app/core/service/auth-service.ts`.

| Método | Efecto |
| --- | --- |
| `initSession()` | Si hay `#access_token` → `bootstrapWithToken`; si no → `restore()` |
| `bootstrapWithToken(jwt)` | `POST /api/auth/bootstrap`; `history.replaceState` limpia el hash; **no** persiste el JWT |
| `restore()` | `GET /api/auth/me` |
| `refreshCsrf()` | `GET /api/auth/csrf` |
| `menu()` | `GET /api/auth/menu` |
| `logout()` | `POST /api/auth/logout` y redirige a Vortal o `/sesion-requerida` |
| `handleSessionExpired()` | 401: limpia memoria y redirige (sin llamar al servidor) |

Signals: `currentUser`, `csrfHeaderName`, `csrfToken`, `expiresAt`.
`isAuthenticated` es `currentUser() !== null`.

En desarrollo, `/sesion-requerida` sigue permitiendo pegar un JWT: solo
se manda a bootstrap; no se guarda.

### 3. Interceptor de cookie + CSRF

Archivo: `src/app/core/interceptors/session.interceptor.ts`.

Para URLs de `environment.api.baseUrl`:

- `withCredentials: true` (la cookie HttpOnly la manda el navegador).
- En mutaciones, header CSRF tomado del **body** de bootstrap/me/csrf
  (no de la cookie `XSRF-TOKEN`).
- 403 de CSRF (`csrf` / `xsrf` en el body): `refreshCsrf()` y **un**
  reintento.

No usar `HttpXsrfInterceptor` / `withXsrfConfiguration`: Angular ignora
URLs absolutas (`http://localhost:8080/...`) y no lee `XSRF-TOKEN` si
la API está en otro host.

Registro (`app.config.ts`):

```ts
provideHttpClient(
  withFetch(),
  withInterceptors([httpErrorInterceptor, sessionInterceptor]),
)
```

`httpErrorInterceptor` va **por fuera** para ver solo el resultado
final tras el reintento CSRF.

### 4. 401 / 403

| Código | Comportamiento |
| --- | --- |
| 401 | Sesión inválida o vencida → `handleSessionExpired()` → Vortal |
| 403 CSRF | El `sessionInterceptor` renueva CSRF y reintenta una vez |
| 403 permiso | Toast “sin permiso” (el interceptor de errores ya lo muestra) |

Los toasts se omiten en `/api/auth/` (bootstrap, me, csrf, menu, logout).

### 5. Arranque

```text
1. Vortal abre RVD con #access_token=<JWT>
2. APP_INITIALIZER
     AuthService.initSession()
       POST /rvd/api/auth/bootstrap { accessToken }
       Cookie RVD_SESSION (HttpOnly) + body usuario/CSRF
       Se borra el hash; el JWT no se guarda
3. MenuService.load()
     GET /rvd/api/auth/menu   ← BFF, no SecurityAuth
4. Sidebar: padres 01–06 que vengan en el árbol y estén en FUNC_ROUTE_MAP
5. PermissionService: Set de códigos (padres e hijas) → can('02_02')
```

Sin hash (F5): `GET /me`. Si la cookie sigue viva, se restaura la
sesión y se vuelve a pedir `/menu`.

Guard de rutas privadas: si `currentUser` es null, `restore()`; si
sigue null, Vortal (prod) o `/sesion-requerida` (dev).

---

## Qué debe hacer el backend para que `/menu` funcione

`GET /api/auth/menu` **no** puede leer el JWT de
`authentication.getCredentials()`.

El converter crea un `UsernamePasswordAuthenticationToken(user, jwt, …)`.
Spring llama `eraseCredentials()` y deja `credentials = null`. El
client entonces manda `Authorization: Bearer null` a SecurityAuth y
RVD responde **502**. El SPA traga el error y pinta el sidebar vacío
aunque `/me` sí funcione (el principal no se borra).

Fuente de verdad: `OpaqueSessionStore` (cookie `RVD_SESSION` →
`OpaqueSession.accessToken`). Es el mismo criterio que
`CookieBearerTokenResolver`.

```java
String accessToken = resolveAccessToken(request) // cookie → store
        .orElseThrow(() -> new ApiException(UNAUTHORIZED, "…"));
return ResponseEntity.ok(menuClient.arbolRoles(
        user.getRoles(),
        applicationId,
        accessToken));
```

- Sin cookie válida (ni Bearer de respaldo en dev) → **401**, no 502.
- Body = JSON tal cual de SecurityAuth (`[{ codigo, nombre, funHijas }]`).
- **No** devolver el JWT al navegador.
- Roles a SecurityAuth: query params repetidos
  (`?roles=A&roles=B&idAplicacion=55100`), no un string unido por comas.

No desactivar `eraseCredentialsAfterAuthentication` ni meter el JWT en
`AuthUserDetails`. Eso desincroniza el `SecurityContext` del store.

---

## Menú y botones (igual que antes)

El JWT no pinta pantallas. El árbol sí.

| Capa | Responsabilidad |
| --- | --- |
| Vortal | Quién tiene qué funcionalidad |
| SecurityAuth | JWT + `/funcionalidad/arbol-roles` |
| Backend RVD | Cookie → JWT del store; 401/403 reales (`METHOD:URL`) |
| Angular | Cookie + CSRF, menú de padres, ocultar botones con `can(...)` |

Padres (`FUNC_ROUTE_MAP`): `01`…`06` → rutas Angular.
Hijas (`PRELOAD_FUNC`, etc.): `02_02` → botón “Agregar docente”.

Angular no pregunta `if (rol === 'Coordinador')`.

---

## Despliegue

- El origen del front debe estar en `CorsConfig.allowedOrigins`.
- Mismo host para cookie: no mezclar `127.0.0.1` (front) con
  `localhost` (API). Son orígenes distintos y la cookie no viaja.
- Front y API en dominios registrables distintos (no subdominios de
  `unipamplona.edu.co`): `same-site: None` y `secure: true`.
- Con `SameSite=Lax` basta si ambos son el mismo sitio
  (`localhost` + `localhost`, o subdominios de la universidad).

---

## Cómo comprobarlo

1. Abrir RVD con `#access_token=<JWT>` o pegar el JWT en
   `/sesion-requerida` (solo dev).
2. Network → `POST /rvd/api/auth/bootstrap` 200, `Set-Cookie:
   RVD_SESSION=…` (HttpOnly). El body **no** trae `accessToken`.
3. La URL pierde el hash (`history.replaceState`).
4. Application → Storage: **no** hay `rvd.auth.token`.
5. `GET /rvd/api/auth/menu` 200 con nodos `01`, `02`, hijas `02_xx`.
6. **Cero** requests del navegador a `:8171` o `/funcionalidad/arbol-roles`.
7. Recargar: `GET /me` 200 y el menú vuelve a cargar.
8. Mutación (POST/PUT/DELETE): header `X-XSRF-TOKEN` presente.
9. Salir: `POST /logout` 204 y cookie borrada.

Si `/me` es 200 y `/menu` es 502, el backend sigue leyendo
`getCredentials()` en vez del store.

---

## Archivos del frontend

| Área | Ruta |
| --- | --- |
| Sesión | `src/app/core/service/auth-service.ts` |
| Modelo | `src/app/core/model/session-user.model.ts` (`SessionResponse`, `CsrfResponse`) |
| Cookie + CSRF | `src/app/core/interceptors/session.interceptor.ts` |
| Errores | `src/app/core/interceptors/http-error.interceptor.ts` |
| Menú | `src/app/core/service/menu-service.ts` → `GET /api/auth/menu` |
| Guard | `src/app/core/guards/auth.guard.ts` (async + `restore`) |
| Arranque | `src/app/app.config.ts` |
| Login local | `src/app/features/auth/session-required/` |
| Config | `src/environments/environment*.ts` (sin `securityAuthUrl` ni keys de token) |

Eliminados: `auth.interceptor.ts`, `storage-service.ts`, dependencia
`jwt-decode`, proxy `/security-auth`.
