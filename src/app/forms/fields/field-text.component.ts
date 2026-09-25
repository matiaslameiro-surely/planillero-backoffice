import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { READONLY_ATTRIBUTE, READONLY_STYLES } from './readonly-contract';

@Component({
  selector: 'app-field-text',
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
        type="text"
        class="field-input"
        [value]="value() ?? ''"
        (input)="onInput($event)"
        (blur)="blurEvent.emit()"
        [readonly]="readonly()"
        [maxLength]="maxLength()"
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
export class FieldTextComponent {
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
  // ya montado, el límite se actualiza (PLAN-60).
  protected readonly maxLength = computed<number>(() => (this.schema()['maxLength'] as number) ?? 0);
  protected inputId = `field-text-${crypto.randomUUID().slice(0, 8)}`;

  protected onInput(event: Event): void {
    if (this.readonly()) {
      return;
    }
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.value);
  }
}
