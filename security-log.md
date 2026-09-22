# Log de Consideraciones de Seguridad - Backoffice (Angular)

## Matriz de Riesgos OWASP / Privacidad / Acceso / API Keys

### Riesgo 1: Almacenamiento de Refresh Token en localStorage (Vulnerable a XSS)
**Categoría:** Acceso / Almacenamiento Inseguro (OWASP A03:2021 - Injection / A05:2021 - Security Misconfiguration)

**Descripción:** El refresh token se persiste en `localStorage` (clave `planillero.refresh`) para sobrevivir a recargas de página. `localStorage` es accesible vía JavaScript, por lo que cualquier vulnerabilidad XSS (inyección de script) permite exfiltrar el token y tomar control de la sesión.

**Medidas Implementadas:**
- ✅ **Access token solo en memoria**: El access token (JWT de 15 min) vive exclusivamente en variable privada del servicio `TokenStoreService`, **nunca** se persiste en `localStorage` ni `sessionStorage`.
- ✅ **Renovación automática transparente**: `AuthService.refresh()` se dispara automáticamente ante 401 (via `authInterceptor`), comparte una sola promesa entre llamadas concurrentes (`shareReplay`), y actualiza el access token en memoria.
- ✅ **Logout limpio**: `AuthService.logout()` llama a `POST /api/v1/auth/logout` (revoca refresh token en backend) y luego limpia `localStorage` y memoria.
- ✅ **Mitigación XSS**: Angular sanitiza automáticamente interpolaciones (`{{ }}`), `innerHTML` usa `DomSanitizer`, y plantillas evitan `bypassSecurityTrustHtml` salvo casos controlados.

**Decisión de diseño**: Se mantiene `localStorage` para el refresh token por simplicidad y compatibilidad con la arquitectura actual (stateless backend, sin cookies HttpOnly). **Riesgo aceptado y documentado**; migración a cookie `HttpOnly; Secure; SameSite=Strict` planificada para post-MVP.

---

### Riesgo 2: Fuga de Datos Sensibles en Navegador / DevTools
**Categoría:** Privacidad (OWASP A01:2021 - Broken Access Control / A09:2021 - Security Logging)

**Descripción:** Datos personales (listados de operadores, visitas, evidencias, auditoría) podrían quedar expuestos en DevTools (Network tab, Application tab, Console) o en cachés del navegador.

**Medidas Implementadas:**
- ✅ **Sin caching de respuestas autenticadas**: Backend envía `Cache-Control: no-store, private` en endpoints `/api/v1/**` (Spring Security default para OAuth2 Resource Server).
- ✅ **Guards de ruta por rol**: `AuthenticatedGuard`, `SupervisorGuard`, `AdministratorGuard` (`src/app/core/guards/`) bloquean navegación no autorizada **antes** de cargar componente o resolver datos.
- ✅ **Interceptores no loguean bodies**: `authInterceptor` adjunta `Authorization` pero no registra request/response bodies en consola.
- ✅ **DTOs sin campos sensibles**: Interfaces TypeScript (`SessionUser`, `Visit`, `Evidence`, `AuditLogEntry`) excluyen `password_hash`, `refresh_token_hash`, `two_factor_secret`, `hmac_key`.

---

### Riesgo 3: Ataques CSRF / Clickjacking / MIME Sniffing
**Categoría:** Acceso / Integridad (OWASP A01:2021 - Broken Access Control / A05:2021 - Security Misconfiguration)

**Descripción:** Formularios o endpoints mutables (`POST`, `PUT`, `DELETE`) expuestos a CSRF; página embebida en iframe (clickjacking); navegador interpretando contenido como tipo incorrecto (MIME sniffing).

**Medidas Implementadas:**
- ✅ **Backend stateless + JWT en header**: Autenticación vía `Authorization: Bearer` (no cookies), lo que **invalida CSRF** por diseño (el navegador no envía header `Authorization` automáticamente en peticiones cross-origin).
- ✅ **Headers de seguridad en backend** (PR actual): `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Content-Security-Policy: default-src 'self'`.
- ✅ **HTTPS obligatorio**: `environment.prod.ts` usa `https://`; builds de producción Angular con `--configuration=production` fuerzan HTTPS.

---

### Riesgo 4: Acceso No Autorizado a Funcionalidades Administrativas
**Categoría:** Acceso / Control de Acceso (OWASP A01:2021 - Broken Access Control)

**Descripción:** Usuarios con rol `OPERATOR` o `SUPERVISOR` podrían acceder a endpoints o vistas de `ADMINISTRATOR` (auditoría, configuración global) manipulando la URL o el estado local.

**Medidas Implementadas:**
- ✅ **Guards de Angular por rol**: `AdministratorGuard` protege `/auditoria`, `SupervisorGuard` protege `/planificacion` y `/supervision`.
- ✅ **Verificación en backend (@PreAuthorize)**: Todos los endpoints sensibles validan rol en Spring Security (`@PreAuthorize("hasRole('ADMINISTRATOR')")`), **independiente** del frontend.
- ✅ **Estado de sesión reactivo**: `AuthService.status` (Signal `loading`/`signedIn`/`signedOut`) y `user.roles` actualizados tras `ensureSession()` y `refresh()`. UI reacciona y oculta/muestra elementos según rol.

---

## Verificaciones Realizadas

| Verificación | Estado | Evidencia |
|---|---|---|
| Access token solo en memoria | ✅ | `src/app/core/services/token-store.service.ts` |
| Refresh token en localStorage (documentado) | ✅ | `src/app/core/services/token-store.service.ts` |
| Interceptor 401 → refresh + retry único | ✅ | `src/app/core/interceptors/auth.interceptor.ts` |
| Guards por rol (Admin, Supervisor, Auth) | ✅ | `src/app/core/guards/*.ts`, `app.routes.ts` |
| Backend valida rol con @PreAuthorize | ✅ | Endpoints audit, supervision, planning |
| Headers seguridad backend (CSP, HSTS, etc.) | ✅ | PR actual `SecurityConfig.java` |
| Sin caching respuestas autenticadas | ✅ | Spring Security OAuth2 default |

---

## Pendientes / Mejoras Futuras (Post-MVP)

- [ ] Migrar refresh token a cookie `HttpOnly; Secure; SameSite=Strict` (requiere cambio en backend `RestAuthenticationEntryPoint` y `CookieSerializer`).
- [ ] Content Security Policy con nonces/hashes para scripts inline si se requieren.
- [ ] Rate limiting de peticiones mutables en frontend (debounce + backend Bucket4j).
- [ ] Auditoría de acciones de usuario en frontend (log local de eventos críticos → sync a backend).