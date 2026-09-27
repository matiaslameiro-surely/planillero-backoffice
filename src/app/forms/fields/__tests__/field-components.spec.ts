import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FieldBooleanComponent } from '../field-boolean.component';
import { FieldMultiSelectComponent } from '../field-multiselect.component';
import { FieldNumberComponent } from '../field-number.component';
import { FieldSelectComponent } from '../field-select.component';
import { FieldTextComponent } from '../field-text.component';
import { EMPTY_READONLY_VALUE } from '../readonly-contract';
import type { JsonSchema } from '../../types';

/**
 * Comportamiento de los componentes de campo del formulario dinámico (PLAN-60).
 *
 * Dos cosas se comprueban acá, y las dos son regresiones reales:
 *
 * 1. Los valores derivados del esquema se leían una sola vez, en `ngOnInit`. Con el componente ya
 *    montado y un `schema()` distinto, la vista quedaba con los datos del esquema anterior. Estos
 *    casos cambian el input SIN recrear el componente: si algo vuelve a leerlo una sola vez, fallan.
 * 2. El expediente es un registro ya enviado: en solo lectura ningún control puede alterarlo, y el
 *    que no tiene valor se distingue del que sí.
 */

type ComponenteCampo =
  | FieldTextComponent
  | FieldNumberComponent
  | FieldSelectComponent
  | FieldMultiSelectComponent
  | FieldBooleanComponent;

/** Los cinco exponen la misma salida de cambio; es lo que se usa para detectar alteraciones. */
type CampoConSalida = ComponenteCampo & { valueChange: { subscribe(fn: (v: unknown) => void): void } };

/**
 * El esquema que recibe un campo es el de SU propiedad, no el de la raíz: lo hace
 * `dynamic-form.component.ts` al aplanar `properties`. Estos fixtures son subschemas.
 */
const SCHEMA_ENUM = { type: 'string', title: 'Estado', enum: ['PENDIENTE', 'CERRADO'] } as JsonSchema;
const SCHEMA_ENUM_2 = { type: 'string', title: 'Estado', enum: ['ALTA', 'URGENTE'] } as JsonSchema;

const SCHEMA_MAXLONG = { type: 'string', title: 'Nota', maxLength: 12 } as JsonSchema;
const SCHEMA_MAXLONG_2 = { type: 'string', title: 'Nota', maxLength: 40 } as JsonSchema;

const SCHEMA_DECIMAL = { type: 'number', title: 'Monto' } as JsonSchema;
const SCHEMA_ENTERO = { type: 'integer', title: 'Monto' } as JsonSchema;

const SCHEMA_ARRAY = {
  type: 'array',
  title: 'Riesgos',
  items: { type: 'string', enum: ['FRIO', 'ALTURA'] },
} as JsonSchema;

const SCHEMA_ARRAY_2 = {
  type: 'array',
  title: 'Riesgos',
  items: { type: 'string', enum: ['RUIDO'] },
} as JsonSchema;

const SCHEMA_BOOL = { type: 'boolean', title: 'Conforme' } as JsonSchema;

function montar<T>(componente: Type<T>, entradas: Record<string, unknown>) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [componente] });
  const fixture = TestBed.createComponent(componente);
  for (const [clave, valor] of Object.entries(entradas)) {
    fixture.componentRef.setInput(clave, valor);
  }
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('Componentes de campo del formulario dinámico (PLAN-60)', () => {
  beforeEach(() => TestBed.resetTestingModule());

  describe('Lo derivado del esquema se recalcula cuando el esquema cambia', () => {
    it('el select lista las opciones del esquema nuevo, sin recrear el componente', () => {
      const { fixture, el } = montar(FieldSelectComponent, { name: 'estado', schema: SCHEMA_ENUM });
      expect([...el.querySelectorAll('option')].map((o) => o.textContent?.trim())).toEqual([
        'Seleccionar...',
        'PENDIENTE',
        'CERRADO',
      ]);

      fixture.componentRef.setInput('schema', SCHEMA_ENUM_2);
      fixture.detectChanges();

      expect([...el.querySelectorAll('option')].map((o) => o.textContent?.trim())).toEqual([
        'Seleccionar...',
        'ALTA',
        'URGENTE',
      ]);
    });

    it('el multiselect lista las opciones del esquema nuevo, sin recrear el componente', () => {
      const { fixture, el } = montar(FieldMultiSelectComponent, { name: 'riesgos', schema: SCHEMA_ARRAY });
      expect([...el.querySelectorAll('.chip span')].map((s) => s.textContent?.trim())).toEqual([
        'FRIO',
        'ALTURA',
      ]);

      fixture.componentRef.setInput('schema', SCHEMA_ARRAY_2);
      fixture.detectChanges();

      expect([...el.querySelectorAll('.chip span')].map((s) => s.textContent?.trim())).toEqual(['RUIDO']);
    });

    it('el campo de texto adopta el maxLength del esquema nuevo', () => {
      const { fixture, el } = montar(FieldTextComponent, { name: 'nota', schema: SCHEMA_MAXLONG });
      const input = el.querySelector('input') as HTMLInputElement;
      expect(input.maxLength).toBe(12);

      fixture.componentRef.setInput('schema', SCHEMA_MAXLONG_2);
      fixture.detectChanges();

      expect(input.maxLength).toBe(40);
    });

    it('el campo numérico adopta el paso del esquema nuevo', () => {
      const { fixture, el } = montar(FieldNumberComponent, { name: 'monto', schema: SCHEMA_DECIMAL });
      const input = el.querySelector('input') as HTMLInputElement;
      expect(input.getAttribute('step')).toBe('any');

      fixture.componentRef.setInput('schema', SCHEMA_ENTERO);
      fixture.detectChanges();

      expect(input.getAttribute('step')).toBe('1');
    });
  });

  describe('En solo lectura el registro no se puede alterar', () => {
    /** Dispara el evento con el que un control emitiría su valor, y mira si algo sale. */
    function emissions(
      componente: Type<CampoConSalida>,
      entradas: Record<string, unknown>,
      disparador: (el: HTMLElement) => void,
    ): unknown[] {
      const { fixture, el } = montar(componente, { ...entradas, readonly: true });
      const emitido: unknown[] = [];
      fixture.componentInstance.valueChange.subscribe((v) => emitido.push(v));
      disparador(el);
      return emitido;
    }

    it('el campo de texto no emite', () => {
      const salidas = emissions(
        FieldTextComponent,
        { name: 'nota', schema: SCHEMA_MAXLONG, value: 'Sin novedad' },
        (el) => {
          const input = el.querySelector('input') as HTMLInputElement;
          input.value = 'otro texto';
          input.dispatchEvent(new Event('input'));
        },
      );
      expect(salidas).toEqual([]);
    });

    it('el campo numérico no emite', () => {
      const salidas = emissions(
        FieldNumberComponent,
        { name: 'monto', schema: SCHEMA_ENTERO, value: 3 },
        (el) => {
          const input = el.querySelector('input') as HTMLInputElement;
          input.value = '99';
          input.dispatchEvent(new Event('input'));
        },
      );
      expect(salidas).toEqual([]);
    });

    it('el select no emite', () => {
      const salidas = emissions(
        FieldSelectComponent,
        { name: 'estado', schema: SCHEMA_ENUM, value: 'PENDIENTE' },
        (el) => {
          const select = el.querySelector('select') as HTMLSelectElement;
          select.value = 'CERRADO';
          select.dispatchEvent(new Event('change'));
        },
      );
      expect(salidas).toEqual([]);
    });

    it('el multiselect no emite', () => {
      const salidas = emissions(
        FieldMultiSelectComponent,
        { name: 'riesgos', schema: SCHEMA_ARRAY, value: ['FRIO'] },
        (el) => {
          const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event('change'));
        },
      );
      expect(salidas).toEqual([]);
    });

    it('el booleano no emite', () => {
      const salidas = emissions(
        FieldBooleanComponent,
        { name: 'conforme', schema: SCHEMA_BOOL, value: false },
        (el) => {
          const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event('change'));
        },
      );
      expect(salidas).toEqual([]);
    });
  });

  describe('En solo lectura el texto y el número siguen siendo legibles y copiables', () => {
    it('llevan readonly, no disabled: hay que poder llegar con el teclado y seleccionar', () => {
      const texto = montar(FieldTextComponent, { name: 'nota', schema: SCHEMA_MAXLONG, readonly: true });
      const numero = montar(FieldNumberComponent, { name: 'monto', schema: SCHEMA_ENTERO, readonly: true });
      const textoInput = texto.el.querySelector('input') as HTMLInputElement;
      const numeroInput = numero.el.querySelector('input') as HTMLInputElement;

      expect(textoInput.readOnly).toBe(true);
      expect(textoInput.disabled).toBe(false);
      expect(numeroInput.readOnly).toBe(true);
      expect(numeroInput.disabled).toBe(false);
    });

    it('el select, el multiselect y el booleano llevan disabled, que es lo que el estándar ofrece', () => {
      const select = montar(FieldSelectComponent, { name: 'estado', schema: SCHEMA_ENUM, readonly: true });
      const multi = montar(FieldMultiSelectComponent, { name: 'riesgos', schema: SCHEMA_ARRAY, readonly: true });
      const bool = montar(FieldBooleanComponent, { name: 'conforme', schema: SCHEMA_BOOL, readonly: true });

      expect((select.el.querySelector('select') as HTMLSelectElement).disabled).toBe(true);
      expect((multi.el.querySelector('input') as HTMLInputElement).disabled).toBe(true);
      expect((bool.el.querySelector('input') as HTMLInputElement).disabled).toBe(true);
    });
  });

  describe('El contrato se aplica sólo en solo lectura', () => {
    // El array se tipa a mano porque `it.each` con clases heterogéneas no unifica el tipo del
    // constructor y TypeScript termina exigiendo que todas sean la primera.
    const CAMPOS: readonly [string, Type<ComponenteCampo>, Record<string, unknown>][] = [
      ['campo de texto', FieldTextComponent, { name: 'nota', schema: SCHEMA_MAXLONG }],
      ['campo numérico', FieldNumberComponent, { name: 'monto', schema: SCHEMA_ENTERO }],
      ['select', FieldSelectComponent, { name: 'estado', schema: SCHEMA_ENUM }],
      ['multiselect', FieldMultiSelectComponent, { name: 'riesgos', schema: SCHEMA_ARRAY }],
      ['booleano', FieldBooleanComponent, { name: 'conforme', schema: SCHEMA_BOOL }],
    ];

    it.each(CAMPOS)('el %s marca el contenedor en readonly y no en edit', (_nombre, componente, entradas) => {
      const readonly = montar(componente, { ...entradas, readonly: true });
      expect(readonly.el.querySelector('.field-container')?.hasAttribute('data-readonly')).toBe(true);

      const edit = montar(componente, { ...entradas, readonly: false });
      expect(edit.el.querySelector('.field-container')?.hasAttribute('data-readonly')).toBe(false);
    });
  });

  describe('En solo lectura no se insinúa una acción pendiente', () => {
    const CON_PLACEHOLDER: readonly [string, Type<ComponenteCampo>, Record<string, unknown>][] = [
      ['campo de texto', FieldTextComponent, { name: 'nota', schema: SCHEMA_MAXLONG }],
      ['campo numérico', FieldNumberComponent, { name: 'monto', schema: SCHEMA_ENTERO }],
    ];

    it.each(CON_PLACEHOLDER)(
      '%s esconde el placeholder en readonly y lo muestra en edit',
      (_nombre, componente, entradas) => {
        // El placeholder sugiere qué escribir. En un registro ya enviado no hay nada que escribir,
        // y además la descripción ya está escrita arriba del campo: mostrarla dos veces es ruido.
        const conDescripcion = { ...entradas, description: 'Texto orientativo' };
        const readonly = montar(componente, { ...conDescripcion, readonly: true });
        expect((readonly.el.querySelector('input') as HTMLInputElement).placeholder).toBe('');

        const edit = montar(componente, { ...conDescripcion, readonly: false });
        expect((edit.el.querySelector('input') as HTMLInputElement).placeholder).toBe('Texto orientativo');
      },
    );
    it('el select no ofrece la opción de arranque', () => {
      const { el } = montar(FieldSelectComponent, {
        name: 'estado',
        schema: SCHEMA_ENUM,
        value: 'PENDIENTE',
        readonly: true,
      });
      const textos = [...el.querySelectorAll('option')].map((o) => o.textContent?.trim());
      expect(textos).toEqual(['PENDIENTE', 'CERRADO']);
      expect(el.textContent).not.toContain('Seleccionar');
    });

    it('el select en readonly muestra y selecciona el valor guardado aunque no sea el primero del enum', () => {
      const { el } = montar(FieldSelectComponent, {
        name: 'estado',
        schema: SCHEMA_ENUM,
        value: 'CERRADO',
        readonly: true,
      });
      const select = el.querySelector('select') as HTMLSelectElement;
      expect(select.value).toBe('CERRADO');
      expect(select.options[select.selectedIndex]?.textContent?.trim()).toBe('CERRADO');
    });

    it('un select sin valor muestra la raya, no una caja vacía', () => {
      const { el } = montar(FieldSelectComponent, {
        name: 'estado',
        schema: SCHEMA_ENUM,
        value: '',
        readonly: true,
      });
      const textos = [...el.querySelectorAll('option')].map((o) => o.textContent?.trim());
      expect(textos).toEqual([EMPTY_READONLY_VALUE, 'PENDIENTE', 'CERRADO']);
    });

    it('en modo edit el select sí ofrece la opción de arranque', () => {
      const { el } = montar(FieldSelectComponent, { name: 'estado', schema: SCHEMA_ENUM });
      expect([...el.querySelectorAll('option')].map((o) => o.textContent?.trim())).toContain(
        'Seleccionar...',
      );
    });

    const CON_ASTERISCO: readonly [string, Type<ComponenteCampo>, Record<string, unknown>][] = [
      [
        'campo de texto',
        FieldTextComponent,
        { name: 'nota', schema: { ...SCHEMA_MAXLONG, required: ['nota'] } },
      ],
      [
        'select',
        FieldSelectComponent,
        { name: 'estado', schema: { ...SCHEMA_ENUM, required: ['estado'] } },
      ],    ];

    it.each(CON_ASTERISCO)(
      '%s oculta el asterisco de requerido en readonly y lo muestra en edit',
      (_nombre, componente, entradas) => {
        const readonly = montar(componente, { ...entradas, required: true, readonly: true });
        expect(readonly.el.querySelector('.required')).toBeNull();

        const edit = montar(componente, { ...entradas, required: true, readonly: false });
        expect(edit.el.querySelector('.required')?.textContent?.trim()).toBe('*');
      },
    );
  });

  describe('El interruptor sí/no tiene nombre accesible (PLAN-72)', () => {
    /** Resuelve el texto de los elementos a los que apunta un atributo aria-*by, como un lector. */
    function textoReferido(el: HTMLElement, input: HTMLInputElement, atributo: string): string {
      const ids = input.getAttribute(atributo)?.split(' ') ?? [];
      return ids
        .map((id) => el.querySelector<HTMLElement>(`[id="${id}"]`))
        .map((ref) => {
          if (!ref) return '';
          const copia = ref.cloneNode(true) as HTMLElement;
          copia.querySelectorAll('[aria-hidden="true"]').forEach((oculto) => oculto.remove());
          return copia.textContent?.trim() ?? '';
        })
        .join(' ');
    }

    it('el checkbox se nombra con el texto del campo, sin el asterisco, y lleva la descripción', () => {
      const { el } = montar(FieldBooleanComponent, {
        name: 'requiereSeguimiento',
        schema: SCHEMA_BOOL,
        label: 'Requiere seguimiento',
        description: 'Marcar si hay que volver a la visita.',
        required: true,
      });
      const input = el.querySelector('input[type="checkbox"]') as HTMLInputElement;

      expect(textoReferido(el, input, 'aria-labelledby')).toBe('Requiere seguimiento');
      expect(textoReferido(el, input, 'aria-describedby')).toBe('Marcar si hay que volver a la visita.');
      expect(input.getAttribute('aria-required')).toBe('true');
    });

    it('sin descripción no apunta a un elemento inexistente, y en solo lectura no se anuncia obligatorio', () => {
      const { el } = montar(FieldBooleanComponent, {
        name: 'conforme',
        schema: SCHEMA_BOOL,
        label: 'Conforme',
        required: true,
        readonly: true,
      });
      const input = el.querySelector('input[type="checkbox"]') as HTMLInputElement;

      expect(textoReferido(el, input, 'aria-labelledby')).toBe('Conforme');
      expect(input.hasAttribute('aria-describedby')).toBe(false);
      expect(input.hasAttribute('aria-required')).toBe(false);
    });

    it('dos interruptores en el mismo formulario no comparten ids', () => {
      const a = montar(FieldBooleanComponent, { name: 'a', schema: SCHEMA_BOOL, label: 'A' });
      const idA = a.el.querySelector('input')!.getAttribute('aria-labelledby');
      const b = montar(FieldBooleanComponent, { name: 'b', schema: SCHEMA_BOOL, label: 'B' });
      const idB = b.el.querySelector('input')!.getAttribute('aria-labelledby');

      expect(idA).not.toBe(idB);
    });
  });

  describe('El contrato no pisa la validación en modo edit', () => {
    it('el campo de texto sigue emitiendo su valor cuando es editable', () => {
      const { fixture, el } = montar(FieldTextComponent, { name: 'nota', schema: SCHEMA_MAXLONG });
      const emitido = vi.fn();
      fixture.componentInstance.valueChange.subscribe(emitido);

      const input = el.querySelector('input') as HTMLInputElement;
      input.value = 'Sin novedad';
      input.dispatchEvent(new Event('input'));

      expect(emitido).toHaveBeenCalledWith('Sin novedad');
    });

    it('el campo numérico en modo edit conserva fondo blanco y no hereda la superficie de solo lectura', () => {
      // El estilo local .field-input:read-only se eliminó y se delega al contrato compartido.
      // El contrato usa [data-readonly] input { background: var(--color-surface-muted) }, que
      // SÓLO aplica cuando el contenedor tiene el atributo. En modo edit no lo tiene, así que
      // el fondo debe seguir siendo --color-surface (blanco). Este test evita que una regla
      // global o un orden de especificidad filtre el muted a modo edit.
      const { el } = montar(FieldNumberComponent, {
        name: 'monto',
        schema: { type: 'number', title: 'Monto' },
        readonly: false,
      });
      const input = el.querySelector('input') as HTMLInputElement;
      const estilo = getComputedStyle(input);
      expect(estilo.backgroundColor).not.toBe('rgb(248, 250, 252)');
    });
  });
});
