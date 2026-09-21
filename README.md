# planillero-backoffice

Backoffice web de Planillero. Angular 22 con TypeScript estricto y SCSS.

## Requisitos

**Node 22.22.3+ o 24.15+** — el rango exacto que declaran `@angular/cli`, `@angular/build` y
`@angular/core`, y que está en `engines` del `package.json` y en `.nvmrc`. Un Node 23, o un 22 o 24
anterior a esos, no construye el proyecto; si el build falla con un error raro de módulos, mirá
primero la versión de Node.

Los tests corren con **Vitest sobre jsdom**, así que **no hace falta ningún navegador instalado**.
(Angular ya no genera Karma.)

## Puesta en marcha

```bash
npm ci
npm start      # http://localhost:4200
```

## Comandos

```bash
npm start           # servidor de desarrollo
npm run build       # build de producción, en dist/
npm run watch       # build incremental en modo desarrollo

npm run lint        # ESLint; los warnings también fallan
npm test            # tests con Vitest
```

## Docker

El backoffice se empaqueta como imagen **NGINX sin privilegios** (`Dockerfile`, multi-stage: Node 24
compila y `nginxinc/nginx-unprivileged` sirve). Normalmente no se construye a mano: lo levanta el
`docker-compose.yml` del repo `backend`, junto con el backend, PostgreSQL y MinIO (ver el README de
`backend`).

- **Build `docker`** (`ng build --configuration docker`): usa `src/app/environments/environment.docker.ts`
  con `apiUrl: ''`, o sea **mismo origen**. El bundle llama a `/api/v1/...` y `/salud`, y NGINX los
  proxya al servicio `backend`. Por eso no hace falta CORS y la imagen sirve en cualquier host o puerto.
  El build de producción común sigue apuntando a `http://localhost:8080`.
- **`docker/nginx.conf`**: gzip, headers de seguridad (CSP, HSTS, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`), fallback de la SPA y el proxy al backend. Una ruta sin extensión
  es de la SPA y cae en el `index.html`; una ruta con extensión (`/assets/x.png`) que no existe da 404.
- **`docker/errors/`**: páginas propias para los errores 404, 502 y 503.
- **CSP**: sólo permite recursos propios y los tiles de `https://tile.openstreetmap.org` (el mapa). Si se
  suma otro origen externo (fuentes, analítica, otro proveedor de mapas), hay que declararlo en
  `docker/nginx.conf`.

Para construir la imagen sola (necesita un backend accesible con el nombre `backend` para el proxy):

```bash
docker build -t planillero-backoffice .
```

## Autenticación

El backoffice implementa el login administrativo completo contra los endpoints del backend:

- **Login**: `POST /auth/login` → si el usuario tiene 2FA, segundo paso con `POST /auth/verify-2fa`.
- **Tokens**: access token en **memoria** (no persiste al recargar); refresh token en **`localStorage`** (con fallback en memoria si no hay `localStorage`, p.ej. en tests/Vitest).
- **`HttpInterceptor` funcional** (`src/app/core/interceptors/auth.interceptor.ts`):
  - Adjunta `Authorization: Bearer <accessToken>` en cada petición.
  - Ante `401` por expiración, **refresca una sola vez** (cola compartida para evitar golpes paralelos a `/auth/refresh`), reintenta la petición original y actualiza los tokens.
  - Si el refresh falla (revocado, expirado, ya usado), cierra la sesión y redirige a `/login`.
- **Guardas de navegación** (`canActivate` funcional):
  - `authenticatedGuard`: sin sesión → `/login`.
  - `anonymousGuard`: con sesión → `/` (home).
- **Restauración de sesión** al arrancar: `GET /auth/me` con el access token (si existe en memoria) o intentando refresh con el refresh token guardado. Así recargar la pestaña no tira al login si la sesión sigue viva.
- **Cierre de sesión**: `POST /auth/logout` revoca el refresh token y limpia memoria + `localStorage`.
- **2FA**: página de login con paso para código TOTP; desde la sesión autenticada se puede habilitar/deshabilitar 2FA (`/auth/2fa/setup`, `/auth/2fa/enable`, `/auth/2fa/disable`).

### Archivos clave

| Archivo | Qué hace |
|---|---|
| `src/app/core/services/auth.service.ts` | `login`, `verify2fa`, `refresh`, `logout`, `me`; mantiene la sesión (usuario, roles, tokens). |
| `src/app/core/services/token-store.service.ts` | Access token en memoria, refresh en `localStorage` (fallback memoria). |
| `src/app/core/interceptors/auth.interceptor.ts` | Bearer + refresh compartido ante 401 + reintento; logout si refresh falla. |
| `src/app/core/guards/authenticated.guard.ts` | Protege rutas privadas: sin sesión → `/login`. |
| `src/app/core/guards/anonymous.guard.ts` | Protege `/login`: con sesión → `/`. |
| `src/app/core/models/auth.model.ts` | Tipos: tokens, sesión, roles, resultados de login/2FA. |
| `src/app/pages/login/` | `login.ts`, `login.html`, `login.scss` — formulario + paso 2FA. |
| `src/app/pages/home/` | `home.ts`, `home.html`, `home.scss` — usuario/roles, `/salud`, cerrar sesión. |

## Conexión con el backend

La pantalla inicial consulta `GET /salud` del backend y muestra si hay conexión. Es el diagnóstico más
rápido para saber si la configuración quedó bien.

La URL sale de `src/app/environments/environment.ts`, y el build de producción la reemplaza por
`environment.prod.ts` mediante `fileReplacements` en `angular.json`. El código importa siempre
`environment`: no hay condicionales de entorno repartidos por ahí.

El backend corre local:

```bash
cd ../backend && ./mvnw spring-boot:run
```

### Verificar el flujo completo

1. Levantar backend y backoffice (`npm start`).
2. Abrir `http://localhost:4200` → redirige a `/login`.
3. Ingresar `operador.demo / Operador123!` → entra a home (sin 2FA), muestra usuario/rol y estado de `/salud`.
4. Cerrar sesión → vuelve a `/login`.
5. Ingresar `supervisor.demo / Supervisor123!` tras haber habilitado 2FA → pide código TOTP → tras código correcto, entra a home.
6. Recargar la pestaña (F5): la sesión se restaura vía `GET /auth/me` (o refresh) y no pide login de nuevo.
7. Esperar a que expire el access token (15 min) → una petición dispara refresh automático, reintenta y sigue funcionando.

## Estructura

```
src/app/
├── core/                 # lo transversal, una sola instancia por aplicación
│   ├── guards/
│   │   ├── authenticated.guard.ts    # sin sesión → /login
│   │   └── anonymous.guard.ts        # con sesión → /
│   ├── interceptors/
│   │   └── auth.interceptor.ts       # Bearer + refresh compartido + reintento
│   ├── models/
│   │   ├── auth.model.ts             # tokens, sesión, roles, login/2FA results
│   │   └── health.model.ts           # respuesta de /salud
│   └── services/
│       ├── auth.service.ts           # login, verify2fa, refresh, logout, me
│       ├── token-store.service.ts    # access en memoria, refresh en localStorage
│       └── health.service.ts         # GET /salud
├── shared/               # componentes, pipes y utilidades reutilizables
├── pages/                # una carpeta por feature, con carga diferida
│   ├── login/
│   │   ├── login.ts
│   │   ├── login.html
│   │   └── login.scss
│   └── home/
│       ├── home.ts
│       ├── home.html
│       └── home.scss
├── environments/         # un archivo por entorno (environment.ts, environment.prod.ts)
├── styles/               # tokens de diseño (_variables.scss)
└── app.routes.ts         # rutas '' (protegida) y 'login' (anónima) con guards, carga diferida
```

**No se clonó `base-frontend`**: esa plantilla trae autenticación contra el gateway corporativo, y
este backoffice se autentica contra el backend de Planillero. Se tomó su organización de carpetas, que
es lo que sirve, y no lo que ata a otro sistema.

### Convenciones

- **Los estilos usan tokens, no valores sueltos.** Colores, espaciados y radios salen de
  `styles/_variables.scss`. `stylePreprocessorOptions` apunta ahí, así que los partials se importan
  sin ruta relativa: `@use 'variables' as *;`.
- **Las features van en `pages/<feature>/` con carga diferida**, registradas en `app.routes.ts` con
  `loadComponent`. Así su código no entra en el bundle inicial.
- **Los servicios no lanzan excepciones por fallos de red.** Devuelven una unión discriminada
  (`{ estado: 'conectado' } | { estado: 'error' }`) que obliga a contemplar el caso de error.
- **`HttpClient`, no `fetch`**: es lo que permite sumar interceptors cuando llegue la autenticación,
  sin tocar los servicios.
- **Componentes con `ChangeDetectionStrategy.OnPush`** y estado con signals.

## Cómo se trabaja en este repo

Este repo se clona **dentro** del workspace del harness, no suelto:

```
planillero/          # repo del harness: protocolo, specs y scripts
├── backend/
├── frontend/
└── backoffice/      # este repo
```

Las tareas salen de Jira y se llevan por el ciclo que describe `AGENTS.md` en ese repo. El push directo
a `main` está bloqueado por un hook: el trabajo va en una rama `PLAN-<n>-<slug>` y entra por
pull request.