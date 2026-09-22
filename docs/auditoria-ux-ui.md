# Auditoría UX/UI del backoffice web

**Tarea:** PLAN-18 · **Fecha:** 22 de septiembre de 2026 · **Commit auditado:** `ee035d7` (`main`)
**Producto:** Planillero Central — backoffice web (Angular 22)
**Perfil de usuario evaluado:** supervisor central, navegador de escritorio a 1920x1080, zoom 100 %

---

## 1. Resumen ejecutivo

Se auditaron las **ocho pantallas** del backoffice contra **cinco heurísticas de Nielsen**, más una
verificación medida de contraste y legibilidad. Se registran **33 hallazgos**.

| Severidad | Cantidad |
|---|---|
| Crítica | 1 |
| Alta | 8 |
| Media | 16 |
| Baja | 8 |
| **Total** | **33** |

El backoffice **funciona**, y en algunas decisiones está por encima del promedio: el panel de
excepciones del tablero de supervisión, la marca «Diferida» que sólo señala lo anómalo, y el cruce
`min`/`max` entre las fechas del filtro de auditoría son buen diseño deliberado, no casualidad.

El problema no es la calidad de cada pantalla por separado: es que **no hay producto, hay seis
pantallas**. Cada una se construyó en su propia tarea con su propia escala de color, su propia
convención de nombres, su propio tratamiento del texto y su propia idea de cómo se vuelve atrás. El
usuario paga esa deuda cada vez que cruza de una a otra.

### Las tres acciones de mayor impacto

1. **Corregir el color primario institucional** (`H27`, única severidad crítica). `$color-primary:
   #208aef` con texto blanco da **3,53:1**, por debajo del mínimo AA de 4,5:1. Es el color de todos
   los botones de acción de login y home: es lo primero que ve cualquier usuario del sistema y no
   cumple. Oscurecerlo hasta ≥ 4,5:1 es un cambio de una línea en un archivo.

2. **Dar navegación global a la aplicación** (`H17`). `app/app.html:1` es literalmente
   `<router-outlet />`: no hay barra, ni menú, ni rastro de ubicación. Dos de las seis pantallas
   operativas —supervisión y expediente— no tienen siquiera un enlace de regreso, así que son
   callejones sin salida de los que sólo se sale con el botón «atrás» del navegador. Esto es la causa
   raíz de varios hallazgos de consistencia y de reconocimiento: sin un lugar donde vivan la
   identidad visual y la navegación, cada pantalla la reinventa.

3. **Pedir confirmación antes de asignar trabajo** (`H12`). «Asignar seleccionadas (N)» ejecuta la
   asignación sin diálogo previo y sin deshacer, y el operador destino **se autoselecciona solo**
   (`app/pages/planificacion/planificacion.ts:193-195` toma `operators[0]` si no hay ninguno elegido). Un clic puede volcarle
   la jornada a un operador que el supervisor nunca eligió conscientemente. Es la única acción del
   backoffice con consecuencias sobre el trabajo real de una persona y es la que menos fricción tiene.

---

## 2. Método y alcance

### Qué se auditó

Las ocho rutas declaradas en `src/app/app.routes.ts`:

| # | Ruta | Componente | Rol requerido |
|---|---|---|---|
| P1 | `/login` | `Login` | anónimo |
| P2 | `/` | `Home` | autenticado |
| P3 | `/planificacion` | `Planificacion` + `RouteMap` | supervisor |
| P4 | `/supervision` | `Supervision` + `SupervisionMap` | supervisor |
| P5 | `/auditoria` | `Auditoria` | administrador |
| P6 | `/evidence/:visitId` | `EvidenceViewer` | autenticado |
| P7 | `/expediente/:visitId` | `ExpedienteComponent` + formularios dinámicos | supervisor |
| P8 | `/acceso-denegado` | `AccessDenied` | autenticado |

### Cómo se auditó

**Toda afirmación de este informe se sostiene sobre una cita `archivo:línea`** del repositorio, en el
commit indicado en la cabecera. No se usan capturas de pantalla: una captura envejece con los datos de
prueba y no dice dónde está el problema. Las rutas de las citas son relativas a `src/` salvo indicación
contraria.

Los **ratios de contraste** de la sección 8 no se estimaron a ojo: se calcularon con la fórmula de
luminancia relativa de WCAG 2.1 (§ *contrast ratio*, con la corrección sRGB), sobre los 58 pares
texto/fondo efectivamente presentes en la interfaz. Los colores con transparencia (`opacity`, `rgba`)
se compusieron antes sobre su fondo real.

### Escala de severidad

La severidad mide **impacto operativo**, no cantidad de píxeles. El mismo defecto pesa más en el
tablero de supervisión —donde se toman decisiones en tiempo real— que en una pantalla de consulta.

| Severidad | Criterio |
|---|---|
| **Crítica** | Impide o degrada el uso para una parte de los usuarios, o incumple un mínimo normativo (WCAG AA) en un elemento central del sistema |
| **Alta** | Provoca error operativo, pérdida de trabajo o bloqueo de flujo; o afecta la pantalla de decisión en vivo |
| **Media** | Obliga a esfuerzo cognitivo evitable, o rompe la coherencia del producto de forma visible |
| **Baja** | Defecto de acabado; se nota, no cuesta trabajo |

---

## 3. Heurística 1 — Visibilidad del estado del sistema

> *El sistema debe mantener informado al usuario sobre lo que ocurre, con retroalimentación adecuada
> y en un tiempo razonable.*

**Veredicto: cumple parcialmente.** Todas las pantallas tienen estados de carga explícitos y todas
informan sus errores con `role="alert"`. Lo que falla es el eje del **tiempo**: el sistema dice *qué*
pasa, pero no *cuándo* pasó ni cuándo volverá a pasar, y eso importa justo en la pantalla que vive del
dato fresco.

**Lo que está bien resuelto** (se verificó pantalla por pantalla):

- P1 login: el botón cambia a «Entrando…» / «Verificando…» y se deshabilita (`app/pages/login/login.html:31-37`).
- P2 home: estado tripartito explícito de la conexión con el backend — consultando / conectado / sin
  conexión, con el motivo del fallo (`app/pages/home/home.html:18-33`).
- P3 planificación: «Consultando visitas…», vacío explícito y botón «Asignando…» (`app/pages/planificacion/planificacion.html:64-68`, `:57`).
- P4 supervisión: spinner en el botón de refresco (`app/pages/supervision/supervision.html:33-35`).
- P5 auditoría: «Consultando auditoría…» y vacío diferenciado (`app/pages/auditoria/auditoria.html:92-94`).
- P6 evidencias: «Cargando evidencias periciales…» y vacío explícito (`app/pages/evidence-viewer/evidence-viewer.html:98-103`).
- P7 expediente: «Cargando expediente...» (`app/pages/expediente/expediente.component.ts:17-18`).
- P8 acceso denegado: es una pantalla de estado en sí misma y explica la causa (`app/pages/access-denied/access-denied.html:3`).

### Hallazgos

**`H1` — El tablero en vivo no comunica la antigüedad del dato · severidad: alta · P4**
`app/pages/supervision/supervision.html:41-42` muestra `Actualizado: {{ lastUpdated() }}`, una hora
absoluta. El polling corre cada 30 o 60 s (`app/pages/supervision/supervision.ts:39-40`), pero la interfaz no
indica cuánto falta para el próximo refresco ni cuánto hace que se refrescó. En una pantalla cuya razón
de ser es el estado *en vivo*, el supervisor no puede distinguir un dato de hace 5 segundos de uno de
hace 5 minutos sin mirar el reloj y restar.
*Recomendación:* antigüedad relativa autoactualizada («hace 12 s») y, con el polling en pausa, una
marca visible de que el tablero está congelado.

**`H2` — Un fallo de polling deja el dato viejo en pantalla sin marcarlo como viejo · severidad: alta · P4**
Cuando el refresco falla, `app/pages/supervision/supervision.ts:71-72` y `:81-82` sólo escriben en
`error()`; los KPIs, la lista de operadores y `lastUpdated` conservan los valores del último éxito. La
interfaz queda mostrando un tablero que parece vigente junto a un mensaje de error genérico. Es el peor
modo de fallo posible para un tablero de monitoreo: no deja de informar, informa mal.
*Recomendación:* al fallar, marcar visualmente los datos como obsoletos y decir desde cuándo lo son.

**`H3` — El mensaje de éxito de la asignación nunca caduca · severidad: media · P3**
`app/pages/planificacion/planificacion.ts:176-178` escribe «Asignadas N visita(s) a …» en `notice()` y nada
lo limpia salvo la siguiente acción (`:168`). El cartel queda en pantalla indefinidamente, así que el
supervisor no puede distinguir el acuse de la asignación que acaba de hacer del de una de hace diez
minutos.
*Recomendación:* caducar el aviso de éxito, o anclarlo a la fila afectada en vez de a la página.

**`H4` — «PENDIENTE DE SELLADO» también significa «todavía estoy cargando» · severidad: media · P6**
`app/pages/evidence-viewer/evidence-viewer.html:15-25`: la píldora de estado se resuelve con
`@if (manifest()) … @else { PENDIENTE DE SELLADO }`. Mientras la petición está en vuelo, `manifest()`
es `null`, así que la pantalla afirma un hecho pericial —que la visita no tiene manifiesto sellado—
cuando en realidad todavía no sabe nada. En una pantalla de cadena de custodia, afirmar de más es
grave.
*Recomendación:* tres estados distintos (cargando / sin sellar / sellado), no dos.

**`H5` — El estado de carga viaja dentro del campo de dato · severidad: baja · P4**
`app/pages/supervision/supervision.html:7`: `{{ summary()?.jurisdiction ?? 'Cargando...' }}`. Se usa el
valor del dato para comunicar el estado de la petición. Si el backend devuelve una jurisdicción nula,
la pantalla dirá «Cargando...» para siempre.

---

## 4. Heurística 4 — Consistencia y estándares

> *Los usuarios no deberían tener que preguntarse si distintas palabras, situaciones o acciones
> significan lo mismo.*

**Veredicto: no cumple.** Es la heurística con el peor resultado del informe y la que explica la
sensación general de que el backoffice son seis productos distintos con el mismo login.

**El dato duro:** existe un archivo de tokens de diseño, `app/styles/_variables.scss`, cuyo propio
comentario de cabecera declara la regla —«*Todo color, espaciado o radio sale de acá: nada se escribe a
mano en los componentes*» (`app/styles/_variables.scss:1-2`)—. **Sólo cuatro de las diez hojas de estilo lo
importan**: `home`, `login`, `planificacion` y `auditoria`. No lo importan `supervision.scss`,
`evidence-viewer.scss`, `access-denied.scss`, `supervision-map.scss`, `route-map.scss` ni `app.scss`, y
tampoco los seis componentes que llevan los estilos embebidos en el `.ts` (los cinco campos de
formulario y `dynamic-form`), que por construcción no pueden usar variables SCSS de otro archivo.

### Hallazgos

**`H6` — Cuatro azules primarios distintos conviven en la aplicación · severidad: alta · P1–P7**
El mismo rol visual —«acción primaria»— está pintado de cuatro colores según en qué tarea se escribió
la pantalla:

| Color | Dónde | Cita |
|---|---|---|
| `#208aef` | botones de login y home (token oficial) | `app/styles/_variables.scss:6` |
| `#0284c7` | botón de refresco del tablero | `app/pages/supervision/supervision.scss:36` |
| `#2563eb` | botón de verificación y enlaces del visor | `app/pages/evidence-viewer/evidence-viewer.scss:12` |
| `#2b6cb0` | botón de envío de los formularios dinámicos | `app/forms/dynamic-form.component.ts:161` |

Y lo mismo ocurre con los grises de texto secundario, que siguen tres escalas ajenas entre sí:
`#718096` (escala tipo Chakra, en los formularios y el expediente), `#64748b` y `#94a3b8` (escala tipo
Tailwind slate, en supervisión y evidencias) y `#4b5563` (otra, en acceso denegado y planificación).
*Recomendación:* una sola escala en `_variables.scss`, expuesta además como custom properties CSS para
que los componentes con estilos embebidos también puedan consumirla.

**`H7` — Los tokens de diseño existen pero no rigen · severidad: alta · transversal**
Ver el recuento de arriba: `app/styles/_variables.scss` se importa en 4 de 10 hojas. Un sistema de diseño
que gobierna menos de la mitad de la interfaz no es un sistema de diseño; es un archivo más. El propio
comentario del archivo reconoce que es «*un conjunto mínimo a propósito*» porque «*el sistema de diseño
está fuera del alcance del esqueleto*» (`app/styles/_variables.scss:3-4`): esa deuda, asumida en PLAN-4,
hoy está vencida.

**`H8` — El regreso a la pantalla anterior tiene cuatro formas, una de ellas la ausencia · severidad: media · P3–P8**

| Pantalla | Qué ofrece | Cita |
|---|---|---|
| P3 planificación | «Volver al inicio» | `app/pages/planificacion/planificacion.html:4` |
| P5 auditoría | «Volver al inicio» | `app/pages/auditoria/auditoria.html:4` |
| P8 acceso denegado | «Volver al inicio» | `app/pages/access-denied/access-denied.html:4` |
| P6 evidencias | «← Volver al Panel» | `app/pages/evidence-viewer/evidence-viewer.html:3` |
| P4 supervisión | *nada* | — |
| P7 expediente | *nada* | — |

Además del texto distinto, «Panel» e «inicio» nombran el mismo destino (`/`) de dos maneras.

**`H9` — La aplicación se declara en inglés · severidad: media · transversal**
`index.html:2` declara `<html lang="en">` con el cien por ciento de la interfaz en español. Afecta a
los lectores de pantalla (pronuncian el español con fonética inglesa), a la corrección ortográfica del
navegador y a la selección tipográfica. Es un carácter de diferencia.

**`H10` — Los encabezados de la grilla de visitas están sin acentuar · severidad: baja · P3**
`app/pages/planificacion/planificacion.html:74`, `:75` y `:78`: «Codigo», «Direccion», «Sincronizacion»,
mientras el resto de la misma pantalla acentúa correctamente («Planificación de rutas», `:3`).

**`H11` — La elipsis de «en curso» se escribe de dos maneras · severidad: baja · transversal**
Carácter `…` (U+2026) en «Asignando…» (`app/pages/planificacion/planificacion.html:57`) y «Consultando
visitas…» (`:65`); tres puntos ASCII en «Actualizando...» (`app/pages/supervision/supervision.html:36`),
«Auditando...» (`app/pages/evidence-viewer/evidence-viewer.html:31`) y «Cargando expediente...»
(`app/pages/expediente/expediente.component.ts:18`).

---

## 5. Heurística 5 — Prevención de errores

> *Mejor que un buen mensaje de error es un diseño cuidadoso que evite que el problema ocurra.*

**Veredicto: cumple parcialmente.** La validación de entrada está bien cubierta —los formularios
dinámicos validan contra JSON Schema con `ajv` y traducen cada error a español
(`app/forms/validation.service.ts:44-60`)—, y hay al menos un caso de prevención ejemplar. Lo que falta es
protección en la única acción con consecuencias reales.

**Lo que está bien resuelto:**

- Los filtros de fecha de auditoría se acotan entre sí: «Desde» lleva `[max]="toFilter()"` y «Hasta»
  lleva `[min]="fromFilter()"` (`app/pages/auditoria/auditoria.html:74` y `:84`). Un rango invertido es
  literalmente inseleccionable. Es exactamente lo que pide la heurística.
- Los botones de acción se deshabilitan mientras la operación está en vuelo y cuando falta un dato
  obligatorio: «Asignar seleccionadas» exige selección y operador (`app/pages/planificacion/planificacion.html:53-56`).
- Las visitas no asignables no muestran casilla ni botón, en vez de mostrarlos y rechazar el intento
  (`app/pages/planificacion/planificacion.html:85-92`, `:101-110`).

### Hallazgos

**`H12` — La asignación de trabajo no pide confirmación, no se puede deshacer, y el destinatario se elige solo · severidad: alta · P3**
Tres decisiones que por separado serían menores se combinan en un riesgo real:

1. `app/pages/planificacion/planificacion.ts:193-195`: al cargar la pantalla, si no hay operador elegido se
   autoselecciona `operators[0]`. El desplegable nunca está vacío, así que **siempre parece que el
   supervisor eligió a alguien**.
2. `app/pages/planificacion/planificacion.ts:152-154`: «Asignar seleccionadas» llama a `assign()` directo.
   No hay `confirm()`, ni diálogo, ni paso intermedio en ninguna parte del repositorio.
3. No existe ninguna operación de deshacer: el acuse (`:176`) informa el hecho consumado.

El resultado es que un clic puede volcar la jornada completa de un operador sobre una persona que el
supervisor nunca eligió conscientemente, sin vuelta atrás desde la interfaz.
*Recomendación:* diálogo de confirmación que nombre operador, fecha y cantidad de visitas; y no
preseleccionar destinatario —«Elegí un operador» como opción inicial.

**`H13` — Se puede planificar para una fecha pasada sin ninguna advertencia · severidad: media · P3**
`app/pages/planificacion/planificacion.html:19-24`: el `<input type="date">` no lleva `min` ni validación
posterior. Se puede asignar una hoja de ruta a una fecha ya transcurrida, que es casi siempre un error
de tipeo en el año o el mes. Contrasta con el cuidado puesto en los filtros de auditoría (`H12`, lo
positivo de arriba): la misma casa resuelve bien el caso inofensivo y deja abierto el costoso.

**`H14` — La regla de estilo que distingue los campos de sólo lectura no existe para el navegador · severidad: media · P7**
`app/forms/fields/field-text.component.ts:46` y `app/forms/fields/field-number.component.ts:48` declaran
`.field-input:readonly { background: #f7fafc; }`. **`:readonly` no es un selector CSS válido**: el
pseudo-selector definido por la especificación es `:read-only`, con guion. La regla se descarta al
parsear y nunca se aplica. Como el expediente digital renderiza el formulario en modo `readonly`
(`app/pages/expediente/expediente.component.ts:51`), sus campos se ven **idénticos a campos editables**: el
usuario descubre que no puede escribir sólo cuando lo intenta. El atributo HTML sí está bien puesto
(`app/forms/fields/field-text.component.ts:23`), así que el dato está protegido; lo que falla es el aviso visual.

**`H15` — El cierre del visor pericial con Escape depende de dónde haya quedado el foco · severidad: media · P6**
`app/pages/evidence-viewer/evidence-viewer.html:144-149`: el `(keydown.escape)` está en el `<div
role="dialog">`, un elemento sin `tabindex` y al que no se le da foco al abrirse. Los eventos de teclado
sólo lo alcanzan si el foco ya está dentro del modal. Como el modal se abre desde una tarjeta que queda
*detrás* de él (`:105-112`), lo habitual es que el foco siga en la tarjeta y Escape no haga nada. No hay
trampa de foco ni retorno de foco al cerrar.

**`H16` — La descripción del campo desaparece justo cuando se está escribiendo · severidad: baja · P7**
`app/forms/fields/field-text.component.ts:26` y `app/forms/fields/field-number.component.ts` usan
`[placeholder]="description()"`: la ayuda del campo se muestra como texto de marcador de posición, que
se borra al primer carácter. Los otros tres campos del mismo conjunto la muestran como texto
permanente bajo la etiqueta (`app/forms/fields/field-boolean.component.ts:47`,
`app/forms/fields/field-multiselect.component.ts:42`). Además de inconsistente entre hermanos, es un
antipatrón conocido: la ayuda se va en el momento en que hace falta.

---

## 6. Heurística 6 — Reconocimiento antes que recuerdo

> *Minimizar la carga de memoria del usuario haciendo visibles los objetos, acciones y opciones.*

**Veredicto: no cumple.** El backoffice le pide al supervisor que recuerde dos cosas que debería estar
viendo: **dónde está** y **qué significan los códigos del backend**.

### Hallazgos

**`H17` — No existe navegación global: la aplicación no tiene esqueleto · severidad: alta · transversal**
`app/app.html:1` es, completo, `<router-outlet />`. No hay barra superior, ni menú lateral, ni rastro
de navegación, ni indicación de la pantalla activa, ni identidad visual persistente. Las consecuencias
son concretas:

- El supervisor no puede saber qué secciones existen sin haberlas memorizado. La única enumeración de
  destinos está en el home, condicionada por rol (`app/pages/home/home.html:34-41`).
- Ir de supervisión a auditoría exige volver al home primero, pero **supervisión no tiene enlace de
  regreso** (`H8`): el único camino es el botón «atrás» del navegador.
- Cada pantalla reimplementa por su cuenta su cabecera y su regreso, que es la causa raíz directa de
  `H8` y contribuye a `H6` y `H7`.

**`H18` — Los estados de las visitas se muestran crudos en tres de las cuatro pantallas que los usan · severidad: alta · P3, P6, P7**
Supervisión traduce los estados con un `@switch` explícito — `EN_CAMPO` → «En campo», `TURNO_COMPLETO`
→ «Turno completo» (`app/pages/supervision/supervision.html:137-142`)—. Ninguna otra pantalla lo hace:

| Pantalla | Qué muestra | Cita |
|---|---|---|
| P3 planificación | `visit.urgency` y `visit.status` crudos en la grilla | `app/pages/planificacion/planificacion.html:97-98` |
| P3 planificación | `visit.urgency` crudo en la hoja de ruta | `app/pages/planificacion/planificacion.html:146` |
| P7 expediente | `visit.status` y `visit.urgency` crudos en la cabecera | `app/pages/expediente/expediente.component.ts:27-28` |
| P7 expediente | ambos otra vez en la ficha de detalle | `app/pages/expediente/expediente.component.ts:38-39` |
| P6 evidencias | `verificationStatus` crudo («VERIFIED» / «TAMPERED») | `app/pages/evidence-viewer/evidence-viewer.html:21` |
| P6 evidencias | `evidenceType` crudo en cada tarjeta | `app/pages/evidence-viewer/evidence-viewer.html:124` |

El usuario ve `IN_PROGRESS`, `HIGH`, `TAMPERED`: identificadores de programación, en inglés, en
mayúsculas con guiones bajos, en una interfaz por lo demás en español. Que la misma información aparezca
legible en una pantalla y cruda en la siguiente es lo que convierte un problema de traducción en uno de
consistencia.

**`H19` — Las fechas de la auditoría se muestran sin formatear · severidad: media · P5**
`app/pages/auditoria/auditoria.html:109` imprime `{{ log.createdAt }}` sin el pipe `date`, así que la
columna más consultada de la bitácora muestra la marca temporal cruda del backend. El visor de
evidencias, en cambio, sí formatea (`app/pages/evidence-viewer/evidence-viewer.html:49`, `| date: 'medium'`;
`:128`, `| date: 'short'`), y el expediente también (`app/pages/expediente/expediente.component.ts:40`).
Auditoría es la única que no.

**`H20` — Las identidades se muestran como identificadores técnicos · severidad: media · P5, P6**
`app/pages/auditoria/auditoria.html:120-121` muestra `entityType / entityId` —un UUID— como identificación
de la entidad afectada, y `app/pages/evidence-viewer/evidence-viewer.html:6` titula la pantalla con
`Visita: {{ visitId() }}`, otro UUID. El supervisor conoce las visitas por su **código**
(`visit.code`), que es lo que ve en planificación y en el expediente. Se le pide que recuerde, o que
copie y pegue, la correspondencia entre dos identificadores del mismo objeto.

**`H21` — Se muestran hashes completos donde no se puede hacer nada con ellos · severidad: baja · P6**
Cada tarjeta de la galería imprime el SHA-256 íntegro, 64 caracteres
(`app/pages/evidence-viewer/evidence-viewer.html:131-134`), y el manifiesto hace lo mismo con la firma HMAC
(`:41`). La propia pantalla demuestra que sabe hacerlo mejor: en la tabla de diagnóstico trunca a 16
caracteres con puntos suspensivos (`:86-87`). Nadie compara 64 caracteres a ojo; para eso está el botón
«Verificar Integridad Criptográfica».

**`H22` — El código de evento se repite al lado de su propia traducción · severidad: baja · P5**
`app/pages/auditoria/auditoria.html:111-118`: cada fila muestra la etiqueta legible del evento y, pegado,
el código crudo en un `<code>`. El código ya está disponible en el `title` del badge y en el
desplegable de filtro (`:50`), así que la columna lleva dos veces la misma información: la versión para
humanos y la versión para máquinas, compitiendo por el mismo espacio.

---

## 7. Heurística 8 — Diseño estético y minimalista, con foco en las excepciones

> *Las interfaces no deben contener información irrelevante o raramente necesaria: cada unidad extra
> compite con las unidades relevantes y disminuye su visibilidad relativa.*

**Veredicto: cumple parcialmente.** Es la heurística donde hay decisiones deliberadas y bien
argumentadas, y conviene decirlo antes que los hallazgos:

- **El panel de excepciones del tablero** (`app/pages/supervision/supervision.html:93-108`) sólo se
  renderiza si hay excepciones activas, encabeza con el conteo y ordena por severidad. Cuando no pasa
  nada, no ocupa nada. Es el patrón correcto.
- **La columna «Sincronización» de planificación** marca únicamente las visitas llegadas en diferido, y
  el propio código explica por qué: «*Poner también "En línea" en el resto llenaría la grilla de una
  palabra que no aporta nada: lo excepcional es lo que hay que poder ver de un vistazo*»
  (`app/pages/planificacion/planificacion.html:100-104`). Es exactamente esta heurística, aplicada a
  conciencia.
- **Las filas de evidencia alterada** se destacan con fondo propio (`row-tampered`,
  `app/pages/evidence-viewer/evidence-viewer.scss:24`).

### Hallazgos

**`H23` — Los seis indicadores del tablero compiten con el mismo peso visual · severidad: alta · P4**
`app/pages/supervision/supervision.scss:53-74`: las seis tarjetas de KPI comparten grilla
(`repeat(auto-fit, minmax(140px, 1fr))`), tamaño de valor (`1.3rem`), tipografía y tratamiento; lo único
que las diferencia es el color del borde izquierdo. «Fuera de SLA / Demorados» —el número que exige
acción inmediata— se ve igual de importante que «Operadores Asignados», que es contexto. En la fila que
el supervisor mira primero, la excepción no se distingue de la rutina; el trabajo lo salva el panel de
abajo, que no debería tener que salvarlo.
*Recomendación:* jerarquizar la fila — los indicadores accionables con mayor peso visual y los de
contexto reducidos a una línea.

**`H24` — La pantalla de evidencias abre con criptografía y deja el hallazgo pericial para después · severidad: media · P6**
El orden de lectura es manifiesto y firma HMAC completa (`app/pages/evidence-viewer/evidence-viewer.html:11-55`),
después la tabla de diagnóstico y recién al final la galería (`:96`). La pregunta que lleva a un
supervisor a esta pantalla —«¿está intacta esta evidencia?»— se responde con una píldora de 11 px
(`styles.scss:6`) en la cabecera, mientras la firma HMAC de 64 caracteres, que nadie lee, ocupa una fila
entera. La jerarquía está invertida respecto de la tarea real.

**`H25` — El home es una pantalla de diagnóstico técnico, no un punto de entrada operativo · severidad: media · P2**
`app/pages/home/home.html:12-31` dedica su tarjeta principal al estado de la conexión con el backend e
imprime la URL de la API (`:35`). Son datos de desarrollo en la primera pantalla que ve el supervisor
después de entrar; los accesos a su trabajo real quedan debajo, como enlaces sueltos (`:39-46`). La URL
del backend, además, no es información que un supervisor pueda usar ni deba ver.

**`H26` — Hay contenido debajo del pliegue en el tablero a 1080p · severidad: baja · P4**
Con cabecera (~90 px), los seis KPI (~110 px), el panel de excepciones cuando está activo (~120 px) y
los títulos de sección, la lista de operadores y el mapa arrancan cerca de los 400 px del alto
disponible. En 1080 px de viewport queda poco más de media pantalla para el contenido principal, que es
donde el supervisor pasa el tiempo.

---

## 8. Legibilidad, contraste y paleta institucional

### 8.1 Método

Ratios calculados con la fórmula de WCAG 2.1: luminancia relativa `L = 0.2126·R + 0.7152·G + 0.0722·B`
sobre los canales linealizados con la corrección sRGB, y contraste `(L₁ + 0.05) / (L₂ + 0.05)`. Los
colores con `opacity` o alpha se compusieron previamente sobre su fondo real. Umbrales AA: **4,5:1**
para texto normal y **3:1** para texto grande (≥ 24 px, o ≥ 18,66 px con peso ≥ 700).

**Supuesto declarado:** `styles.scss` no fija `background` en `body`, así que el fondo efectivo es el
blanco por defecto del navegador y contra `#ffffff` se calculó.

### 8.2 Resultado global

| Métrica | Valor |
|---|---|
| Pares texto/fondo evaluados | 58 |
| **Incumplen WCAG AA** | **14 (24 %)** |
| Textos por debajo de 12 px | 19 (33 %) |
| Texto más pequeño de la interfaz | 9 px (`app/pages/evidence-viewer/evidence-viewer.scss:38`) |

### 8.3 Los 14 pares que incumplen AA

| Elemento | Texto | Fondo | Tamaño | Ratio | Mínimo | Cita |
|---|---|---|---|---|---|---|
| **Botón primario (login y home)** | `#ffffff` | `#208aef` | 16 px | **3,53:1** | 4,5:1 | `app/pages/home/home.scss:100-103` |
| **Botón secundario (ghost)** | `#208aef` | `#ffffff` | 16 px | **3,53:1** | 4,5:1 | `app/pages/home/home.scss:107-110` |
| Botón «Enviar» deshabilitado | `#ffffff` | `#a0c4e8` | 16 px | **1,82:1** | 4,5:1 | `app/forms/dynamic-form.component.ts:164` |
| Subtexto de tarjeta KPI | `#94a3b8` | `#ffffff` | 11,2 px | **2,56:1** | 4,5:1 | `app/pages/supervision/supervision.scss:68` |
| «Sin visita en curso» | `#94a3b8` | `#ffffff` | 11,2 px | **2,56:1** | 4,5:1 | `app/pages/supervision/supervision.scss:140` |
| **«Evidencia intacta»** | `#16a34a` | `#ffffff` | 12 px | **3,30:1** | 4,5:1 | `app/pages/evidence-viewer/evidence-viewer.scss:27` |
| **«Evidencia alterada»** | `#ef4444` | `#ffffff` | 12 px | **3,76:1** | 4,5:1 | `app/pages/evidence-viewer/evidence-viewer.scss:26` |
| Contador de excepciones | `#ffffff` | `#ef4444` | 10,4 px | **3,76:1** | 4,5:1 | `app/pages/supervision/supervision.scss:153` |
| URL de la API (`opacity: .5`) | `#808080` ef. | `#ffffff` | 12 px | **3,95:1** | 4,5:1 | `app/pages/home/home.scss:69-74` |
| Descripción de campo | `#718096` | `#ffffff` | 12 px | **4,02:1** | 4,5:1 | `app/forms/fields/field-boolean.component.ts:47` |
| «Formulario sin campos» | `#718096` | `#ffffff` | 16 px | **4,02:1** | 4,5:1 | `app/forms/dynamic-form.component.ts:154` |
| Etiquetas del expediente | `#718096` | `#ffffff` | 16 px | **4,02:1** | 4,5:1 | `app/pages/expediente/expediente.component.ts:82` |
| Nota «sólo lectura» | `#718096` | `#f7fafc` | 13 px | **3,83:1** | 4,5:1 | `app/pages/expediente/expediente.component.ts:84-85` |
| Mensaje de error de campo | `#e53e3e` | `#ffffff` | 12 px | **4,13:1** | 4,5:1 | `app/forms/fields/field-text.component.ts:47` |

### 8.4 Hallazgos

**`H27` — El color primario institucional no alcanza el mínimo AA · severidad: CRÍTICA · P1, P2**
`app/styles/_variables.scss:6` define `$color-primary: #208aef`. Con texto blanco encima da **3,53:1**,
frente a los 4,5:1 exigidos; y usado como texto sobre blanco en el botón secundario, el mismo 3,53:1.
Es el color de todos los botones de acción del login y del home: el primer contacto de cualquier
usuario con el sistema, en la pantalla que nadie puede saltear. Es además el único hallazgo que
incumple un mínimo normativo en un elemento central, de ahí la severidad.
*Recomendación:* oscurecer el token hasta alcanzar ≥ 4,5:1 sobre blanco. Con `#1268bd` el ratio sube a
4,73:1 conservando el mismo matiz. Es un cambio de una línea.

**`H28` — Un tercio de la interfaz está por debajo de 12 px · severidad: alta · P4, P6, P7**
19 de los 58 textos evaluados bajan de 12 px, y la concentración está justo en la pantalla de decisión
en vivo: los badges de estado del operador van a `0.65rem` = **10,4 px**
(`app/pages/supervision/supervision.scss:150`), los subtextos de KPI a `0.7rem` = 11,2 px (`:68`), las
observaciones y la telemetría a 11,2 px (`:140-141`). El visor llega a **9 px** en la caja de hash
(`app/pages/evidence-viewer/evidence-viewer.scss:38`) y 10 px en el badge de tipo (`:35`). En un monitor de
oficina de 1920x1080 a distancia normal de escritorio, 9-10 px está en el límite de lo descifrable, y
los badges de estado son precisamente lo que el supervisor lee de reojo. El issue pedía verificar
legibilidad en 1080p+: este es el hallazgo que responde a eso.
*Recomendación:* piso de 12 px para todo texto y de 13 px para el que se lee de un vistazo. Hay espacio
de sobra (ver sección 9): la densidad no está comprada con nada.

**`H29` — Los dos estados periciales que más importan son los que peor se leen · severidad: alta · P6**
«Intacta» (`#16a34a`, 3,30:1) y «alterada» (`#ef4444`, 3,76:1), en
`app/pages/evidence-viewer/evidence-viewer.scss:26-27`, son los dos peores contrastes de la pantalla después
del botón deshabilitado, a 12 px. Son el veredicto de la cadena de custodia. Se agrava porque la
distinción entre ambos estados es **sólo cromática** —verde contra rojo, el par que no distingue el 8 %
de los varones con deuteranopía— sin icono ni texto diferenciador propio en la celda.
*Recomendación:* subir el contraste de ambos y agregar un indicador no cromático.

**`H30` — El botón deshabilitado es prácticamente invisible · severidad: media · P7**
`app/forms/dynamic-form.component.ts:164`: blanco sobre `#a0c4e8` da **1,82:1**, el peor de la interfaz. Un
control deshabilitado puede atenuarse, pero su etiqueta tiene que seguir siendo legible: el usuario
necesita leer qué es lo que no puede hacer.

**`H31` — Los grises heredados de dos escalas ajenas rozan o incumplen el mínimo · severidad: media · P4, P7**
`#94a3b8` (2,56:1) en supervisión y `#718096` (4,02:1) en formularios y expediente incumplen; `#64748b`
pasa por 4,76:1, apenas 0,26 por encima del mínimo. Ninguno de los tres sale de
`app/styles/_variables.scss`: son consecuencia directa de `H6` y `H7`. Una paleta unificada y verificada
cierra este hallazgo y los otros de contraste de golpe.

**`H32` — La atenuación por `opacity` produce contrastes que nadie calculó · severidad: baja · P2**
`app/pages/home/home.scss:69-74` atenúa la URL de la API con `opacity: 0.5`, lo que da un `#808080` efectivo
a 3,95:1. El patrón se repite con `0.6` y `0.7` en la misma hoja (`:20`, `:36`, `:66`) — esos sí pasan,
por poco. Atenuar con `opacity` esconde el color real del texto y hace que el contraste sea imposible de
auditar leyendo el código: conviene usar colores explícitos de la paleta.

### 8.5 Coherencia de la paleta

**Supuesto declarado:** no existe manual de marca en ninguno de los tres repositorios, así que se toma
como paleta institucional la declarada en `app/styles/_variables.scss` y se audita **coherencia interna**.
Si aparece una paleta oficial distinta, esta subsección se revalida; los hallazgos `H6` y `H7` siguen
valiendo con cualquier paleta de referencia, porque son sobre la divergencia interna.

La paleta declarada son seis colores (`app/styles/_variables.scss:6-11`). La interfaz usa, contando los
pares auditados, **más de treinta valores hexadecimales distintos**. De los seis tokens, `$color-info`
(`#6c3fc5`) no aparece usado en ninguna pantalla, mientras que el violeta que sí se ve —el KPI de
cumplimiento de SLA— usa otro valor (`#7c3aed`, `app/pages/supervision/supervision.scss:74`). Es la
divergencia de `H6` en su forma más pura: el token existe, el color se necesita, y aun así se escribió
otro a mano.

---

## 9. Verificación en pantalla de oficina (1920x1080)

El issue pide verificar el comportamiento en pantallas de 1080p o superiores, que es el escenario real
del supervisor central.

### 9.1 Anchos máximos declarados

| Pantalla | `max-width` | Equivalente | % de 1920 px | Cita |
|---|---|---|---|---|
| P4 supervisión | `1400px` | 1400 px | 73 % | `app/pages/supervision/supervision.scss:6` |
| P3 planificación | `80rem` | 1280 px | 67 % | `app/pages/planificacion/planificacion.scss:4` |
| P5 auditoría | `80rem` | 1280 px | 67 % | `app/pages/auditoria/auditoria.scss:4` |
| P6 evidencias | `1200px` | 1200 px | 63 % | `app/pages/evidence-viewer/evidence-viewer.scss:1` |
| P7 expediente | `900px` | 900 px | 47 % | `app/pages/expediente/expediente.component.ts:65` |
| P8 acceso denegado | `480px` | 480 px | 25 % | `app/pages/access-denied/access-denied.scss:2` |
| P2 home | `26rem` (tarjetas) | 416 px | 22 % | `app/pages/home/home.scss:25` |
| P1 login | `26rem` (tarjeta) | 416 px | 22 % | `app/pages/login/login.scss:27` |

**`H33` — Cada pantalla decide por su cuenta cuánto monitor usar · severidad: media · transversal**
Cinco anchos máximos distintos para cinco pantallas de contenido, sin ningún criterio común. Al navegar
entre ellas, el bloque de contenido cambia de ancho en cada transición y nada queda anclado en el mismo
lugar. Es `H6` y `H7` otra vez, en la dimensión del espacio en vez de la del color.
*Recomendación:* un contenedor común con dos o tres anchos canónicos (formulario, contenido, tablero)
definidos como tokens.

**`H34` — El expediente desperdicia más de la mitad de la pantalla · severidad: media · P7**
`app/pages/expediente/expediente.component.ts:65` fija `max-width: 900px`. El expediente muestra una lista
de definiciones a dos columnas (`:81`, `grid-template-columns: 180px 1fr`) y debajo el formulario
completo de la visita: en 1920 px quedan 1020 px vacíos mientras el contenido se apila en vertical y
obliga a desplazarse. Un ancho pensado para lectura de prosa aplicado a una ficha de datos.

**`H35` — El home operativo ocupa una columna de 416 px centrada en la pantalla · severidad: media · P2**
`app/pages/home/home.scss:3-10` centra vertical y horizontalmente con `min-height: 100vh`, y las tarjetas se
limitan a `26rem` (`:25`). En login es la decisión correcta —un formulario de acceso—; en el home, que
es el centro de distribución del trabajo diario, deja el 78 % del monitor en blanco y apila los accesos
a las secciones uno debajo del otro.

**`H36` — No hay ningún tratamiento para pantallas grandes · severidad: baja · transversal**
Los dos únicos puntos de quiebre del backoffice miran hacia abajo:
`app/pages/planificacion/planificacion.scss:101` (`max-width: 60rem`) y
`app/pages/supervision/supervision.scss:100` (`max-width: 900px`). No existe ninguna consulta de medios con
`min-width`, así que un monitor de 2560 px se ve exactamente igual que uno de 1400 px, con más blanco a
los costados. Para un producto cuyo único escenario declarado es el escritorio de oficina, toda la
elasticidad del diseño está invertida.

### 9.2 Lo que sí funciona a 1080p

- La grilla de supervisión (`340px 1fr`, `app/pages/supervision/supervision.scss:98`) aprovecha bien el
  ancho: lista de operadores fija y mapa elástico es la proporción correcta para un tablero.
- La grilla de KPIs con `auto-fit` (`:55`) acomoda las seis tarjetas en una sola fila a 1080p, que es lo
  deseable.
- La galería de evidencias con `auto-fill minmax(240px, 1fr)`
  (`app/pages/evidence-viewer/evidence-viewer.scss:28`) rinde cuatro columnas dentro de su contenedor.
- Planificación reparte grilla y panel lateral en `1.4fr / 1fr`
  (`app/pages/planificacion/planificacion.scss:97`), con colapso a una columna por debajo de 960 px.

---

## 10. Tabla de hallazgos priorizados

| ID | Severidad | Heurística | Pantalla | Hallazgo |
|---|---|---|---|---|
| `H27` | **Crítica** | Estética / normativa | P1, P2 | El color primario institucional da 3,53:1 y no alcanza WCAG AA |
| `H1` | Alta | Visibilidad del estado | P4 | El tablero en vivo no comunica la antigüedad del dato |
| `H2` | Alta | Visibilidad del estado | P4 | Un fallo de polling deja el dato viejo en pantalla sin marcarlo |
| `H6` | Alta | Consistencia | P1–P7 | Cuatro azules primarios distintos conviven en la aplicación |
| `H7` | Alta | Consistencia | transversal | Los tokens de diseño existen pero rigen en 4 de 10 hojas |
| `H12` | Alta | Prevención de errores | P3 | Asignar trabajo no pide confirmación y el destinatario se elige solo |
| `H17` | Alta | Reconocimiento | transversal | No existe navegación global: `app.html` es sólo `<router-outlet />` |
| `H18` | Alta | Reconocimiento | P3, P6, P7 | Estados crudos del backend en tres de las cuatro pantallas que los usan |
| `H23` | Alta | Foco en excepciones | P4 | Los seis KPI compiten con el mismo peso visual |
| `H28` | Alta | Legibilidad | P4, P6, P7 | Un tercio de la interfaz está por debajo de 12 px |
| `H29` | Alta | Legibilidad | P6 | Los dos estados periciales que más importan son los que peor se leen |
| `H3` | Media | Visibilidad del estado | P3 | El mensaje de éxito de la asignación nunca caduca |
| `H4` | Media | Visibilidad del estado | P6 | «PENDIENTE DE SELLADO» también significa «cargando» |
| `H8` | Media | Consistencia | P3–P8 | El regreso tiene cuatro formas, una de ellas la ausencia |
| `H9` | Media | Consistencia | transversal | `index.html` declara `lang="en"` con la UI en español |
| `H13` | Media | Prevención de errores | P3 | Se puede planificar para una fecha pasada sin advertencia |
| `H14` | Media | Prevención de errores | P7 | `:readonly` no es un selector válido: los campos bloqueados no se distinguen |
| `H15` | Media | Prevención de errores | P6 | Escape no cierra el visor salvo que el foco haya caído dentro |
| `H19` | Media | Reconocimiento | P5 | Las fechas de la auditoría se muestran sin formatear |
| `H20` | Media | Reconocimiento | P5, P6 | Se identifican las entidades por UUID y no por su código |
| `H24` | Media | Foco en excepciones | P6 | La pantalla abre con criptografía y deja el veredicto para después |
| `H25` | Media | Estética / minimalismo | P2 | El home es una pantalla de diagnóstico técnico |
| `H30` | Media | Legibilidad | P7 | El botón deshabilitado da 1,82:1 |
| `H31` | Media | Legibilidad | P4, P7 | Los grises heredados de escalas ajenas rozan o incumplen el mínimo |
| `H33` | Media | Layout 1080p | transversal | Cinco anchos máximos distintos sin criterio común |
| `H34` | Media | Layout 1080p | P7 | El expediente desperdicia más de la mitad de la pantalla |
| `H35` | Media | Layout 1080p | P2 | El home operativo ocupa una columna de 416 px |
| `H5` | Baja | Visibilidad del estado | P4 | El estado de carga viaja dentro del campo de dato |
| `H10` | Baja | Consistencia | P3 | Encabezados de la grilla de visitas sin acentuar |
| `H11` | Baja | Consistencia | transversal | La elipsis de «en curso» se escribe de dos maneras |
| `H16` | Baja | Prevención de errores | P7 | La descripción del campo desaparece al empezar a escribir |
| `H21` | Baja | Reconocimiento | P6 | Hashes completos de 64 caracteres donde no se puede hacer nada con ellos |
| `H22` | Baja | Reconocimiento | P5 | El código de evento se repite al lado de su propia traducción |
| `H26` | Baja | Foco en excepciones | P4 | Contenido debajo del pliegue en el tablero a 1080p |
| `H32` | Baja | Legibilidad | P2 | La atenuación por `opacity` produce contrastes que nadie calculó |
| `H36` | Baja | Layout 1080p | transversal | No hay ningún tratamiento para pantallas grandes |

> Los identificadores no son correlativos con el orden de esta tabla: se asignaron por sección de
> lectura (§3 a §9) y acá se reordenan por severidad. Un mismo `ID` siempre nombra el mismo hallazgo.

### Secuencia de remediación sugerida

1. **Una línea, impacto inmediato:** `H27` (color primario), `H9` (`lang="es"`), `H14` (`:read-only`),
   `H10` (acentos). Riesgo cero, verificación trivial.
2. **Legibilidad:** `H28`, `H29`, `H30`, `H31`, `H32` — un piso tipográfico y una escala de grises
   verificada cierran los cinco a la vez.
3. **Esqueleto de la aplicación:** `H17` (navegación global) y, colgando de él, `H8`, `H33`, `H35`.
4. **Seguridad operativa:** `H12` (confirmación de asignación), `H13`, `H15`.
5. **Sistema de diseño:** `H6` y `H7` — unificar los tokens y exponerlos como custom properties CSS
   para que los componentes con estilos embebidos también los consuman.
6. **Lenguaje del dominio:** `H18`, `H19`, `H20`, `H21`, `H22` — una capa común de traducción de
   estados y formatos.
7. **Jerarquía informativa:** `H1`, `H2`, `H3`, `H4`, `H23`, `H24`, `H25`, `H26`, `H34`, `H36`.

---

## 11. Hallazgos bajo las otras cinco heurísticas

El issue pide cubrir al menos cinco heurísticas y nombra cuáles. Las cinco restantes no se barrieron en
forma sistemática, pero durante la lectura del código aparecieron observaciones que conviene dejar
anotadas para una auditoría posterior. **No están contabilizadas** en el recuento de la sección 1.

- **Control y libertad del usuario.** No hay ninguna operación de deshacer en todo el backoffice, y el
  modal del visor no devuelve el foco al cerrarse (`app/pages/evidence-viewer/evidence-viewer.html:144-149`).
- **Flexibilidad y eficiencia de uso.** No hay atajos de teclado, ni selección múltiple por rango, ni
  «seleccionar todo» en la grilla de planificación: con muchas visitas, la selección es clic por clic
  (`app/pages/planificacion/planificacion.html:85-92`). Tampoco se recuerdan los filtros entre visitas a
  una misma pantalla.
- **Ayudar a reconocer y recuperarse de los errores.** Los mensajes del tablero son genéricos —«No se
  pudo cargar el resumen del tablero.» (`app/pages/supervision/supervision.ts:72`)— y no ofrecen acción de
  recuperación. Planificación y auditoría sí propagan el mensaje del backend, que es mejor
  (`app/pages/planificacion/planificacion.ts:24-33`).
- **Ayuda y documentación.** No hay ayuda contextual en ninguna pantalla. La excepción es la columna
  «Evento» de auditoría, que documenta cada código con un `title`
  (`app/pages/auditoria/auditoria.html:112-116`) — buena práctica que merecería extenderse.
- **Correspondencia entre el sistema y el mundo real.** Es la otra cara de `H18`: el vocabulario de la
  interfaz alterna entre el del supervisor («visita», «hoja de ruta», «turno») y el de la base de datos
  («entityType», «TAMPERED», `IN_PROGRESS`).

---

## 12. Limitaciones de esta auditoría

Conviene ser explícito sobre qué **no** respalda este informe:

1. **Es una evaluación heurística por inspección de código, no una prueba con usuarios.** Detecta
   violaciones de principios reconocidos; no mide si un supervisor real completa su tarea ni en cuánto
   tiempo. Las dos cosas son complementarias y esta no reemplaza a la otra.
2. **Las mediciones de tamaño de fuente y contraste son estáticas.** Se calcularon a partir de las
   reglas CSS declaradas, con el supuesto de `1rem = 16px` y fondo blanco. No se verificó el render real
   en un navegador, así que un valor heredado o sobrescrito en cascada podría diferir.
3. **Las cinco heurísticas no barridas** (sección 11) pueden esconder hallazgos de severidad alta.
4. **No se auditó accesibilidad completa**: contraste y legibilidad sí; lector de pantalla, orden de
   foco y recorrido íntegro por teclado no, salvo donde aparecieron de paso (`H15`, `H29`).
5. **La paleta institucional se infirió del código** ante la ausencia de un manual de marca. Ver el
   supuesto declarado en § 8.5.
6. **Foto de un commit.** Todo lo afirmado vale para `ee035d7`. Las citas `archivo:línea` envejecen con
   el código.
