import { Component, input, output, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-field-text',
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
        type="text"
        class="field-input"
        [value]="value() ?? ''"
        (input)="onInput($event)"
        (blur)="blurEvent.emit()"
        [readonly]="readonly()"
        [maxLength]="schema()['maxLength']"
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
export class FieldTextComponent implements OnInit {
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

  protected maxLength = 0;
  protected inputId = `field-text-${crypto.randomUUID().slice(0, 8)}`;

  ngOnInit() {
    this.maxLength = (this.schema()['maxLength'] as number) ?? 0;
  }

  protected onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.value);
  }

  protected onBlur() {
    this.blurEvent.emit();
  }
}