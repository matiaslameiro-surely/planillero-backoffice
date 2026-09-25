import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { EMPTY_READONLY_VALUE, READONLY_ATTRIBUTE, READONLY_STYLES } from './readonly-contract';

@Component({
  selector: 'app-field-select',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="field-container" [attr.${READONLY_ATTRIBUTE}]="readonly() ? '' : null">
      <label class="field-label" [for]="selectId">
        {{ label() }}
        @if (required() && !readonly()) {
          <span class="required"> *</span>
        }
      </label>
      <div class="select-wrapper">
        <select
          [id]="selectId"
          class="field-select"
          [value]="value() ?? ''"
          (change)="onChange($event)"
          (blur)="blurEvent.emit()"
          [disabled]="readonly()">
          @if (readonly()) {
            <!-- En solo lectura no se ofrece la opción de arranque: sugiere una elección pendiente
                 sobre un registro ya enviado. Si no hay valor, una raya lo dice sin inventar texto. -->
            @if (!hasValue()) {
              <option value="">{{ EMPTY_READONLY_VALUE }}</option>
            }
          } @else {
            <option value="">{{ description() || 'Seleccionar...' }}</option>
          }
          @for (option of enumValues(); track option) {
            <option [value]="option">{{ option }}</option>
          }
        </select>
      </div>
      @if (touched() && error()) {
        <div class="field-error">{{ error() }}</div>
      }
    </div>
  `,
  styles: [`
    .field-container { margin-bottom: 16px; }
    .field-label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px; color: var(--color-text); }
    .required { color: var(--color-error); }
    .select-wrapper { border: 1px solid var(--color-border-strong); border-radius: 8px; background: var(--color-surface); }
    .field-select {
      width: 100%;
      border: none;
      padding: 10px 12px;
      font-size: 16px;
      background: transparent;
      appearance: none;
    }
    .field-error { margin-top: 4px; font-size: 12px; color: var(--color-error); }
    ${READONLY_STYLES}

    /* El borde de este select no está en el <select>, que va con border:none, sino en el wrapper
       que lo envuelve. El contrato compartido sólo alcanza a los controles nativos, así que sin
       esta regla el expediente en solo lectura mostraría una caja idéntica a la de edición: la
       señal de acción que la tarea pide eliminar. La regla es de este componente y no del contrato
       porque el nombre de la clase no le corresponde al contrato saberlo. */
    [data-readonly] .select-wrapper {
      border-color: transparent;
      background: var(--color-surface-muted);
    }
  `],
})
export class FieldSelectComponent {
  name = input.required<string>();
  schema = input.required<Record<string, unknown>>();
  value = input<unknown>('');
  valueChange = output<string>();
  blurEvent = output<void>();
  error = input<string>();
  touched = input<boolean>(false);
  readonly = input<boolean>(false);
  label = input<string>();
  description = input<string>();
  required = input<boolean>(false);

  // Derivado del signal de entrada y no leído en ngOnInit: si el esquema cambia con el componente
  // ya montado, las opciones se actualizan (PLAN-60).
  protected readonly enumValues = computed<string[]>(
    () => (this.schema()['enum'] as string[]) ?? [],
  );
  protected readonly EMPTY_READONLY_VALUE = EMPTY_READONLY_VALUE;
  protected readonly hasValue = computed(() => {
    const value = this.value();
    return value !== null && value !== undefined && value !== '';
  });
  protected selectId = `field-select-${crypto.randomUUID().slice(0, 8)}`;

  protected onChange(event: Event): void {
    if (this.readonly()) {
      return;
    }
    const target = event.target as HTMLSelectElement;
    this.valueChange.emit(target.value);
  }
}
