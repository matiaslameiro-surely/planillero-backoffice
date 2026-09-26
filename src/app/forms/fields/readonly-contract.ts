/**
 * Contrato único de presentación en modo `readonly` (PLAN-60).
 *
 * Los cinco componentes de campo interpolan `READONLY_STYLES` en sus `styles` y marcan el contenedor
 * del campo con `[attr.data-readonly]`. La regla que se está aplicando es una sola:
 *
 * > En `readonly` se quita la señal de acción y se conserva la información.
 *
 * Por eso el contrato no atenúa nada: el texto que se muestra es el que el operador escribió y tiene
 * que seguir siendo legible. Un solo lectura "grisado" perdería datos y reprobaría contraste, que es
 * justo lo que motivó el token `$color-text-disabled`.
 *
 * Que el texto sea idéntico en los cinco componentes es parte del contrato, no un accidente: es lo
 * que permite auditarlo leyendo los archivos. Con un parcial SCSS compartido la equivalencia se
 * resolvería en el build y no se podría verificar desde un test.
 *
 * Un aviso sobre cómo se agrega CSS a un componente: su `styles` es un literal de template, así que
 * un backtick escrito dentro del CSS --incluso en un comentario, para nombrar una clase-- cierra el
 * literal ahí y convierte el resto en código. El build falla con "Failed to resolve styles at
 * position 0 to a string", que no menciona el archivo ni la línea. No se puede cubrir con un test,
 * porque el build se cae antes de que corra la suite: es una restricción al escribir el CSS.
 *
 * Y el otro aviso, que costó un hallazgo de revisión: `--color-surface-muted` no es "la superficie
 * de solo lectura", es una superficie más. En el expediente el formulario vive dentro de
 * `.form-section`, que ya es ese mismo color, así que la regla de arriba no alcanza a las
 * decoraciones que el contrato no cubre y, si se les aplica el mismo color, desaparecen: un
 * interruptor apagado se ve como un vacío y un chip sin pastilla, como palabras sueltas.
 *
 * La regla que sí generaliza, y la que hay que aplicar caso por caso: la superficie de solo lectura
 * sirve para todo lo que informa con su TEXTO --texto, número, select--, porque el texto va en
 * 16,96:1 y se lee igual sin caja. No sirve para lo que informa con su propia SUPERFICIE o su
 * posición --el interruptor, el chip--: esos tienen que conservar un color que se separe de lo que
 * tengan detrás. Y si además viven dentro de un contenedor que ya es `--color-surface-muted`, el
 * separador tiene que ser el borde o un token de valor, nunca la superficie.
 */

/** Atributo que marca el contenedor de un campo como no editable. */
export const READONLY_ATTRIBUTE = 'data-readonly';

/** Glifo con el que se representa un valor ausente en el selector de solo lectura. */
export const EMPTY_READONLY_VALUE = '—';

export const READONLY_STYLES = `
  /* El color de texto y el cursor sí son genéricos: los heredan el control, su label y sus hijos. */
  [data-readonly] {
    color: var(--color-text);
    cursor: default;
  }

  /* Sin caja: en solo lectura el campo no es un control. El borde más fuerte de la paleta
     (#cbd5e0) da 1,42:1 contra su fondo, muy por debajo del 3:1 de WCAG 1.4.11, así que un borde
     más tenue no podría ser el que informa del estado. Lo que informa es la superficie.
     Se declara 'color' y además '-webkit-text-fill-color' como propiedad para asegurar que motores
     basados en WebKit/Blink mantengan el contraste completo aún en controles deshabilitados. */
  [data-readonly] input,
  [data-readonly] select,
  [data-readonly] textarea {
    background: var(--color-surface-muted);
    border-color: transparent;
    color: var(--color-text);
    -webkit-text-fill-color: var(--color-text);
    cursor: default;
  }

  [data-readonly] label {
    cursor: default;
  }

  /* El control de texto sigue siendo focalizable, porque 'readonly' no es 'disabled': quitar el
     indicador de foco rompería WCAG 2.4.7. La caja desaparece, el foco no. */
  [data-readonly] input:focus-visible,
  [data-readonly] select:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 1px;
  }
`;
