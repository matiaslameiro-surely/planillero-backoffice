import { Component, input, output, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-field-number',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="field-container">
      <label class="field-label" [for]="inputId">
        {{ label() }}
        @if (required()) {
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
        [step]="schema()['type'] === 'integer' ? 1 : 'any'"
        [placeholder]="description()"
      />
      @if (touched() && error()) {
        <div class="field-error">{{ error() }}</div>
      }
    </div>
  `,
  styles: [`
    .field-container { margin-bottom: 16px; }
    .field-label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px; color: #1a1a1a; }
    .required { color: #e53e3e; }
    .field-input {
      width: 100%;
      border: 1px solid #cbd5e0;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 16px;
      background: #fff;
      box-sizing: border-box;
    }
    .field-input:read-only { background: #f7fafc; }
    .field-error { margin-top: 4px; font-size: 12px; color: #e53e3e; }
  `],
})
export class FieldNumberComponent implements OnInit {
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

  protected isInteger = false;
  protected inputId = `field-number-${crypto.randomUUID().slice(0, 8)}`;

  ngOnInit() {
    this.isInteger = this.schema()['type'] === 'integer';
  }

  protected onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    let clean = target.value;

    if (this.isInteger) {
      clean = clean.replace(/[^0-9-]/g, '');
    } else {
      clean = clean.replace(/[^0-9.-]/g, '');
    }

    if (clean === '' || clean === '-' ||
      (this.isInteger ? /^-?\d+$/.test(clean) : /^-?\d*\.?\d*$/.test(clean))) {
      const parsed = clean === '' || clean === '-' ? undefined :
        this.isInteger ? parseInt(clean, 10) : parseFloat(clean);
      this.valueChange.emit(parsed);
    }
  }
}