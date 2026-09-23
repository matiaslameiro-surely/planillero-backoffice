import { Component, input, output, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-field-select',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="field-container">
      <label class="field-label" [for]="selectId">
        {{ label() }}
        @if (required()) {
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
          <option value="">{{ description() || 'Seleccionar...' }}</option>
          @for (option of enumValues; track option) {
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
  `],
})
export class FieldSelectComponent implements OnInit {
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

  protected enumValues: string[] = [];
  protected selectId = `field-select-${crypto.randomUUID().slice(0, 8)}`;

  ngOnInit() {
    this.enumValues = (this.schema()['enum'] as string[]) ?? [];
  }

  protected onChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.valueChange.emit(target.value);
  }
}