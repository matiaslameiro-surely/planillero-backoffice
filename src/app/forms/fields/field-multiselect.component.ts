import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { READONLY_ATTRIBUTE, READONLY_STYLES } from './readonly-contract';

@Component({
  selector: 'app-field-multiselect',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="field-container" [attr.${READONLY_ATTRIBUTE}]="readonly() ? '' : null">
      <span class="field-label">
        {{ label() }}
        @if (required() && !readonly()) {
          <span class="required"> *</span>
        }
      </span>
      @if (description()) {
        <p class="field-description">{{ description() }}</p>
      }
      <div class="chips-container">
        @for (option of enumValues(); track option) {
          <label class="chip" [class.chip-selected]="isSelected(option)">
            <input
              type="checkbox"
              [checked]="isSelected(option)"
              (change)="toggle(option)"
              [disabled]="readonly()"
            />
            <span>{{ option }}</span>
          </label>
        }
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
    .field-description { font-size: 12px; color: var(--color-text-muted); margin: 0 0 8px; }
    .chips-container { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 20px;
      border: 1px solid var(--color-border-strong);
      background: var(--color-surface);
      cursor: pointer;
      transition: all 0.2s;
    }
    .chip-selected { background: var(--color-primary); border-color: var(--color-primary); }
    .chip-selected span { color: var(--color-surface); }
    .chip input { accent-color: var(--color-primary); }
    .field-error { margin-top: 4px; font-size: 12px; color: var(--color-error); }
    ${READONLY_STYLES}

    /* El chip es un <label>, y el contrato compartido no le alcanza: le saca el cursor (eso sí lo
       hace, porque el chip es el label de un control nativo) pero no toca la pastilla. Por eso acá
       no hay ninguna regla de solo lectura para el chip, y es a propósito.

       En el expediente el formulario vive dentro de .form-section, que ya es
       --color-surface-muted: pintar la pastilla de ese color la deja en 1,00:1 contra la sección y
       un multiselect se ve como un conjunto de palabras sueltas, sin poder distinguir qué son
       opciones y qué son respuestas. La pastilla conserva su relleno blanco y su borde porque el
       borde es lo único que la separa de la sección: es el límite del valor, no la caja de un
       control. Las señales de acción se sacan igual, y en otro lugar: el checkbox va deshabilitado
       y el cursor es default. */
  `],
})
export class FieldMultiSelectComponent {
  name = input.required<string>();
  schema = input.required<Record<string, unknown>>();
  value = input<unknown>([]);
  valueChange = output<string[]>();
  blurEvent = output<void>();
  error = input<string>();
  touched = input<boolean>(false);
  readonly = input<boolean>(false);
  label = input<string>();
  description = input<string>();
  required = input<boolean>(false);

  // Derivado del signal de entrada y no leído en ngOnInit: si el esquema cambia con el componente
  // ya montado, las opciones se actualizan (PLAN-60).
  protected readonly enumValues = computed<string[]>(() => {
    const items = this.schema()['items'] as Record<string, unknown> | undefined;
    return (items?.['enum'] as string[]) ?? [];
  });

  protected selectedValue(): string[] {
    return (this.value() as string[]) ?? [];
  }

  protected isSelected(option: string): boolean {
    return this.selectedValue().includes(option);
  }

  protected toggle(option: string): void {
    if (this.readonly()) {
      return;
    }
    const current = this.selectedValue();
    const next = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option];
    this.valueChange.emit(next);
  }
}
