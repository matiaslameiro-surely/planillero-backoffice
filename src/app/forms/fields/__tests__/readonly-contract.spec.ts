import { describe, it, expect } from 'vitest';

import { READONLY_STYLES } from '../readonly-contract';

interface NodeFs {
  readFileSync(path: string, encoding: string): string;
}

interface NodePath {
  join(...paths: string[]): string;
}

declare const require: (module: string) => NodeFs & NodePath;
declare const process: { cwd: () => string };

const fs: NodeFs = require('node:fs');
const path: NodePath = require('node:path');

/**
 * Auditoría del contrato de solo lectura (PLAN-60).
 *
 * El expediente digital es un registro histórico: si un control se ve como un control, quien lo lee
 * no sabe si puede escribir en él. Este test no prueba que los controles se vean iguales, que en
 * jsdom no se puede comprobar: prueba que los cinco componentes declaran el mismo contrato, y que ese
 * contrato cumple lo que promete. Es el mismo enfoque que la guardia de piso tipográfico: leer los
 * archivos y fallar si el código se desvía de lo que la convención exige.
 */

const CAMPOS_DIR = path.join(process.cwd(), 'src/app/forms/fields');

const COMPONENTES = [
  'field-text.component.ts',
  'field-number.component.ts',
  'field-select.component.ts',
  'field-multiselect.component.ts',
  'field-boolean.component.ts',
] as const;

function leer(nombre: string): string {
  return fs.readFileSync(path.join(CAMPOS_DIR, nombre), 'utf-8');
}

/** Luminancia relativa de un color hexadecimal, según WCAG 2.1. */
function luminancia(hex: string): number {
  const valor = hex.replace('#', '');
  const canales = [0, 2, 4].map((i) => parseInt(valor.slice(i, i + 2), 16) / 255);
  const lineal = canales.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * lineal[0] + 0.7152 * lineal[1] + 0.0722 * lineal[2];
}

/** Razón de contraste entre dos colores, entre 1 y 21. */
function contraste(foreground: string, background: string): number {
  const [claro, oscuro] = [luminancia(foreground), luminancia(background)].sort((a, b) => b - a);
  return (claro + 0.05) / (oscuro + 0.05);
}

/**
 * Resuelve un token de la paleta leyendo `_variables.scss`, en lugar de copiar el valor a mano: si
 * alguien cambia la paleta, el contraste se vuelve a medir en vez de quedar desactualizado.
 */
function token(nombre: string): string {
  const scss = fs.readFileSync(path.join(process.cwd(), 'src/app/styles/_variables.scss'), 'utf-8');
  const encontrado = scss.match(new RegExp(`^\\s*\\$${nombre}\\s*:\\s*(#[0-9a-fA-F]{3,6})\\s*;`, 'm'));
  if (!encontrado) {
    throw new Error(`No encontré el token $${nombre} en _variables.scss`);
  }
  return encontrado[1];
}

describe('Contrato de solo lectura (PLAN-60)', () => {
  describe('Los cinco componentes declaran el mismo contrato', () => {
    it.each(COMPONENTES)('%s aplica el atributo del contrato al contenedor del campo', (nombre) => {
      const fuente = leer(nombre);
      // El atributo no se escribe literal en el componente: se interpola desde la constante, para
      // que cambiar el nombre en un solo lugar no requiera editar cinco plantillas.
      expect(fuente).toMatch(/import\s*\{[^}]*\bREADONLY_ATTRIBUTE\b[^}]*\}\s*from\s*'\.\/readonly-contract'/);
      expect(fuente).toMatch(/import\s*\{[^}]*\bREADONLY_STYLES\b[^}]*\}\s*from\s*'\.\/readonly-contract'/);
      expect(fuente).toContain('[attr.${READONLY_ATTRIBUTE}]');
      expect(fuente).toContain("readonly() ? '' : null");
    });

    it.each(COMPONENTES)('%s interpola el contrato en sus estilos', (nombre) => {
      const fuente = leer(nombre);
      expect(fuente).toContain('${READONLY_STYLES}');
    });

    it.each(COMPONENTES)('%s no queda a medias con el patrón de ngOnInit', (nombre) => {
      // Los cuatro leían `schema()` una sola vez en ngOnInit. La reactividad se prueba en el
      // comportamiento; esto es la red que avisa si alguien reintroduce el patrón. Se busca la
      // declaración del método y la interfaz, no la palabra: los comentarios la nombran al explicar
      // qué se cambió.
      const fuente = leer(nombre);
      expect(fuente).not.toMatch(/implements\s+OnInit\b/);
      expect(fuente).not.toMatch(/^\s*(protected\s+|public\s+|private\s+)?ngOnInit\s*\(\s*\)/m);
    });

    it.each(COMPONENTES)('%s oculta el asterisco de requerido en solo lectura', (nombre) => {
      expect(leer(nombre)).toContain('required() && !readonly()');
    });

    it.each(COMPONENTES)('%s no pinta decoraciones con --color-surface-muted en [data-readonly]', (nombre) => {
      // El expediente usa .form-section con ese color. Una decoración (riel, pastilla) con el mismo
      // color queda en 1,00:1 contra la sección: invisible. El contrato ya no llega a esos elementos,
      // así que cada componente decide su propia regla; este test evita que se repita el error.
      //
      // Excepción documentada: .select-wrapper SÍ usa ese color para quitar la caja del select,
      // porque en el select la información ES el texto (16,96:1). Lo mismo aplica a los wrappers de
      // texto y número, pero esos no tienen regla local: el contrato llega al input nativo.
      const fuente = leer(nombre);
      const bloques = fuente.split('[data-readonly]');
      for (let i = 1; i < bloques.length; i++) {
        const bloque = bloques[i].slice(0, bloques[i].indexOf('}') + 1);
        if (bloque.includes('background: var(--color-surface-muted)') ||
            bloque.includes('background:var(--color-surface-muted)') ||
            bloque.includes('background: var(--color-surface-muted )')) {
          const permitidos = [
            '.select-wrapper',
          ];
          const tienePermitido = permitidos.some((p) => bloque.includes(p));
          if (!tienePermitido) {
            throw new Error(
              `${nombre}: bloque [data-readonly] pinta fondo con --color-surface-muted. ` +
                'Ese color es el de la sección; una decoración con él desaparece. ' +
                'Use un token que se separe o conserve el borde del modo edición. ' +
                '(Excepción: .select-wrapper, donde la información es el texto y la caja se quita a propósito.)'
            );
          }
        }
      }
    });

    it.each(COMPONENTES)('%s no quita el borde de chips/pastillas en [data-readonly]', (nombre) => {
      // Un chip es una pastilla: sin borde es una palabra suelta. El borde es información, no caja.
      const fuente = leer(nombre);
      const bloques = fuente.split('[data-readonly]');
      for (let i = 1; i < bloques.length; i++) {
        const bloque = bloques[i].slice(0, bloques[i].indexOf('}') + 1);
        if (bloque.includes('.chip') && bloque.includes('border-color: transparent')) {
          throw new Error(
            `${nombre}: regla [data-readonly] sobre .chip quita el borde. ` +
              'El borde es lo que separa la pastilla de la sección.'
          );
        }
      }
    });
  });

  describe('El contrato cumple lo que promete', () => {
    it('quita caja y cursor de control, y pone la superficie de solo lectura', () => {
      expect(READONLY_STYLES).toContain('background: var(--color-surface-muted)');
      expect(READONLY_STYLES).toContain('border-color: transparent');
      expect(READONLY_STYLES).toContain('cursor: default');
    });

    it('no atenúa el texto con opacity', () => {
      // Atenuar es lo que reprobaba contraste y lo que la guardia de styles prohíbe. El valor tiene
      // que seguir siendo el que escribió el operador.
      expect(READONLY_STYLES).not.toContain('opacity');
    });

    it('anula el atenuado que Blink aplica al texto de un control deshabilitado', () => {
      // En Blink, -webkit-text-fill-color le gana a 'color': sin esta regla el <select> del
      // expediente queda por debajo de 4,5:1 y no hay forma de arreglarlo desde el autor.
      expect(READONLY_STYLES).toContain('-webkit-text-fill-color: var(--color-text)');
    });

    it('conserva el indicador de foco, porque el campo sigue siendo focalizable', () => {
      // 'readonly' no es 'disabled': quitar el foco rompería WCAG 2.4.7.
      expect(READONLY_STYLES).toContain('focus-visible');
      expect(READONLY_STYLES).toContain('outline: 2px solid var(--color-primary)');
    });

    it('usa selectores genéricos, no nombres de clase de un solo componente', () => {
      // Si el contrato nombrara '.chip' o '.select-wrapper', cada una de las cinco copias quedaría
      // con cuatro bloques de reglas muertas.
      expect(READONLY_STYLES).not.toMatch(/\.(chip|select-wrapper|field-input|switch-slider)\b/);
    });
  });

  describe('Contraste del texto de solo lectura', () => {
    it('el texto sobre la superficie de solo lectura cumple AA', () => {
      const ratio = contraste(token('color-text'), token('color-surface-muted'));
      expect(
        ratio,
        `#${token('color-text')} sobre #${token('color-surface-muted')} da ${ratio.toFixed(2)}:1, ` +
          'por debajo de 4,5:1 (WCAG AA para texto normal).',
      ).toBeGreaterThanOrEqual(4.5);
    });

    it('el token de texto deshabilitado es un lastre, no el texto que se ve', () => {
      // Este test no se puede hacer, y vale la pena dejarlo escrito. La atenuación que rompe el
      // contraste no sale de este token: Blink la aplica con su propio factor, que no está en
      // `_variables.scss` y no se puede medir desde acá. Por eso la defensa es la regla explícita de
      // `-webkit-text-fill-color`, no un token más claro.
      //
      // Lo que sí se puede verificar es que el token no se confunda con el texto de solo lectura:
      // si alguien llegara a usarlo, la superficie apagada y el valor apagado se cancelarían.
      const apagado = token('color-text-disabled');
      const normal = token('color-text');
      expect(apagado).not.toBe(normal);
      // Y que el color que sí se aplica cumpla AA sobre la superficie de solo lectura.
      expect(contraste(normal, token('color-surface-muted'))).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('El borde no es lo que informa del estado', () => {
    it('ningún borde de la paleta llega al 3:1 que WCAG 1.4.11 exige', () => {
      // Documenta por qué la solución es quitar la caja y no dibujar un borde más tenue.
      const fondo = token('color-surface-muted');
      expect(contraste(token('color-border-strong'), fondo)).toBeLessThan(3);
      expect(contraste(token('color-border'), fondo)).toBeLessThan(3);
    });
  });

  describe('Lo que se ve sobre la superficie de solo lectura se ve de verdad', () => {
    /**
     * El expediente muestra el formulario dentro de `.form-section`, y ese contenedor es
     * `--color-surface-muted`: la MISMA superficie que aplica el contrato. Por eso una decoración
     * que se pinte de ese color no queda "del mismo tono que el control", queda invisible: en el
     * caso del interruptor, un booleano apagado se dibujaba como un vacío, indistinguible de un
     * campo que no se renderizó. Estos tests miden los pares que tienen que distinguirse, para que
     * el defecto no dependa de que alguien mire la pantalla.
     */
    const seccion = () => token('color-surface-muted');

    it('el riel del interruptor apagado se distingue de la sección', () => {
      const ratio = contraste(token('color-border-strong'), seccion());
      expect(
        ratio,
        `el riel apagado da ${ratio.toFixed(2)}:1 contra la sección: un interruptor en "no" ` +
          'se ve como un vacío y se confunde con un campo que no se renderizó.',
      ).toBeGreaterThan(1.2);
    });

    it('el knob del interruptor se distingue del riel, en los dos estados', () => {
      // El knob es la única parte que se mueve: es lo que dice en qué estado está el interruptor.
      expect(contraste(token('color-surface'), token('color-border-strong'))).toBeGreaterThan(1.2);
      expect(contraste(token('color-surface'), token('color-primary'))).toBeGreaterThan(1.2);
    });

    it('el interruptor encendido se distingue de la sección', () => {
      // El estado encendido lo aplica el navegador vía `input:checked`, con más especificidad que
      // cualquier regla de solo lectura; conviene que siga siendo cierto.
      expect(contraste(token('color-primary'), seccion())).toBeGreaterThan(3);
    });

    it('el chip no seleccionado se distingue de la sección', () => {
      // El chip es una pastilla blanca: sola, sobre una sección casi blanca, no se ve. Lo que la
      // hace visible es el borde, así que el borde es información y no la caja de un control.
      expect(contraste(token('color-border-strong'), seccion())).toBeGreaterThan(1.2);
    });

    it('el chip seleccionado se distingue de la sección', () => {
      expect(contraste(token('color-primary'), seccion())).toBeGreaterThan(3);
    });
  });
});
