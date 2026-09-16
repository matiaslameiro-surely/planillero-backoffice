# planillero-backoffice

Backoffice web de Planillero. Angular 22 con TypeScript estricto y SCSS.

## Requisitos

**Node 22.12+ o 24.15+.** Angular 22 no construye con Node 23 ni con un Node 24 anterior al 24.15; si
el build falla con un error raro de módulos, mirá primero la versión de Node.

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

## Conexión con el backend

La pantalla inicial consulta `GET /salud` del backend y muestra si hay conexión. Es el diagnóstico más
rápido para saber si la configuración quedó bien.

La URL sale de `src/app/environments/environment.ts`, y el build de producción la reemplaza por
`environment.prod.ts` mediante `fileReplacements` en `angular.json`. El código importa siempre
`environment`: no hay condicionales de entorno repartidos por ahí.

El backend todavía no está desplegado en ningún servidor, así que hoy sólo corre local:

```bash
cd ../backend && ./mvnw spring-boot:run
```

## Estructura

Replica la de `base-frontend`, la plantilla Angular del equipo:

```
src/app/
├── core/                 # lo transversal, una sola instancia por aplicación
│   ├── guards/
│   ├── interceptors/
│   ├── models/           # salud.model.ts
│   └── services/         # salud.service.ts
│       └── __tests__/    # los specs de core/ van al lado, en su subcarpeta
├── shared/               # componentes, pipes y utilidades reutilizables
├── pages/                # una carpeta por feature, con carga diferida
│   └── inicio/
├── environments/         # un archivo por entorno
└── styles/               # tokens de diseño (_variables.scss)
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

## Lo que todavía no hay

- **Autenticación.** El backend no la tiene todavía; hasta entonces el backoffice sólo puede mostrar
  pantallas públicas. Es una tarea propia.
- Biblioteca de componentes y sistema de diseño: hay tokens mínimos, nada más.

## Cómo se trabaja en este repo

Este repo se clona **dentro** del workspace del harness, no suelto:

```
planillero/          # repo del harness: protocolo, specs y scripts
├── backend/
├── frontend/
└── backoffice/      # este repo
```

Las tareas salen de Jira y se llevan por el ciclo que describe `AGENTS.md` en ese repo. El push directo
a `main` está bloqueado por un hook: el trabajo va en una rama `PLAN-<n>-<slug>` y entra por pull
request.
