# Informe Final de Auditoría de Seguridad - Backoffice (Angular)

## Resumen Ejecutivo

Auditoría de seguridad del cliente web Backoffice Planillero (Angular 22) conforme a la Sección 6 del documento de entrega final del curso. Se identificaron y mitigaron 4 riesgos críticos en el contexto web (OWASP Top 10).

## Matriz de Riesgos y Estado

| # | Riesgo | Categoría OWASP Web | Estado | Medida Principal |
|---|---|---|---|---|
| 1 | Refresh token en localStorage (XSS) | A03 / A05 | ⚠️ Documentado / Aceptado | Access token solo en memoria, refresh en localStorage, logout limpio, migración a HttpOnly cookie post-MVP |
| 2 | Fuga PII en DevTools / Caché | A01 / A09 | ✅ Mitigado | Guards por rol, no caching autenticado, DTOs limpios, interceptores sin log |
| 3 | CSRF / Clickjacking / MIME Sniffing | A01 / A05 | ✅ Mitigado | JWT en header (stateless), headers backend CSP/HSTS/X-Frame, HTTPS |
| 4 | Acceso no autorizado a funcionalidades admin | A01 | ✅ Mitigado | Guards Angular + @PreAuthorize backend, estado reactivo por rol |

## Verificaciones Técnicas

| Verificación | Resultado | Comando / Evidencia |
|---|---|---|
| Lint (Angular) | ✅ Pass | `npm run lint` |
| Build / Tipos | ✅ Pass | `npm run build` |
| Tests (Vitest) | ✅ 64/64 pass | `npm test` |
| Access token solo memoria | ✅ Código | `src/app/core/services/token-store.service.ts` |
| Guards por rol funcionales | ✅ Tests | Guards + `app.routes.ts` |
| Backend headers seguridad | ✅ PR actual | `SecurityConfig.java` headers CSP, HSTS, X-Frame |

## Video Demostrativo

**Enlace público:** `[Diferido a backlog - PLAN-32]` — *Decisión de Sprint 4: el video consolidado (backend + móvil + backoffice) se graba y publica en PLAN-32. Guion listo abajo; URL se inserta al grabar.*

**Parte backoffice del video (incluida en video consolidado):**
- Login SUPERVISOR / ADMINISTRATOR
- Tablero de supervisión + mapa operativo
- Módulo de auditoría (solo ADMINISTRATOR) + verificación cadena SHA-256

## Archivos Generados

- `security-log.md` — Matriz detallada con evidencias
- `informe.md` — Este documento

---

**Auditor:** Juan Ignacio Urrutia  
**Fecha:** 2026-09-22  
**Tarea Jira:** PLAN-17