import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { READONLY_ATTRIBUTE, READONLY_STYLES } from './readonly-contract';

@Component({
  selector: 'app-field-number',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="field-container" [attr.${READONLY_ATTRIBUTE}]="readonly() ? '' : null">
      <label class="field-label" [for]="inputId">
        {{ label() }}
        @if (required() && !readonly()) {
          <span class="required"> *</span>
        }
      </label>
      <input
        [id]="inputId"
        type="number"
        class="field-input"
        [value]="value() ?? ''"
        (input)="onInput($event)"
        (blur)="blurEvent.emit()"
        [readonly]="readonly()"
        [min]="schema()['minimum']"
        [max]="schema()['maximum']"
        [step]="isInteger() ? 1 : 'any'"
        [placeholder]="readonly() ? '' : description()"
      />
      @if (touched() && error()) {
        <div class="field-error">{{ error() }}</div>
      }
    </div>
  `,
  styles: [`
    .field-container { margin-bottom: 16px; }
    .field-label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px; color: var(--color-text); }
    .required { color: var(--color-error); }
    .field-input {
      width: 100%;
      border: 1px solid var(--color-border-strong);
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 16px;
      background: var(--color-surface);
      box-sizing: border-box;
    }
    .field-error { margin-top: 4px; font-size: 12px; color: var(--color-error); }
    ${READONLY_STYLES}
  `],
})
export class FieldNumberComponent {
  name = input.required<string>();
  schema = input.required<Record<string, unknown>>();
  value = input<unknown>('');
  valueChange = output<number | undefined>();
  blurEvent = output<void>();
  error = input<string>();
  touched = input<boolean>(false);
  readonly = input<boolean>(false);
  label = input<string>();
  description = input<string>();
  required = input<boolean>(false);

  // Derivado del signal de entrada y no leído en ngOnInit: si el esquema cambia con el componente
  // ya montado, el paso y el filtrado de la entrada se actualizan (PLAN-60).
  protected readonly isInteger = computed<boolean>(() => this.schema()['type'] === 'integer');
  protected inputId = `field-number-${crypto.randomUUID().slice(0, 8)}`;

  protected onInput(event: Event): void {
    if (this.readonly()) {
      return;
    }
    const target = event.target as HTMLInputElement;
    let clean = target.value;

    if (this.isInteger()) {
      clean = clean.replace(/[^0-9-]/g, '');
    } else {
      clean = clean.replace(/[^0-9.-]/g, '');
    }

    if (clean === '' || clean === '-' ||
      (this.isInteger() ? /^-?\d+$/.test(clean) : /^-?\d*\.?\d*$/.test(clean))) {
      const parsed = clean === '' || clean === '-' ? undefined :
        this.isInteger() ? parseInt(clean, 10) : parseFloat(clean);
      this.valueChange.emit(parsed);
    }
  }
}
