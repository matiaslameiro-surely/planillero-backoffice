import { Component, input, output, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-field-multiselect',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="field-container">
      <span class="field-label">
        {{ label() }}
        @if (required()) {
          <span class="required"> *</span>
        }
      </span>
      @if (description()) {
        <p class="field-description">{{ description() }}</p>
      }
      <div class="chips-container">
        @for (option of enumValues; track option) {
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
    .field-label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px; color: #1a1a1a; }
    .required { color: #c0392b; /* $color-error: 5,44:1 */ }
    .field-description { font-size: 12px; color: #5b6778; /* $color-text-muted: 5,74:1 */ margin: 0 0 8px; }
    .chips-container { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 20px;
      border: 1px solid #cbd5e0;
      background: #fff;
      cursor: pointer;
      transition: all 0.2s;
    }
    .chip-selected { background: #2b6cb0; border-color: #2b6cb0; }
    .chip-selected span { color: #fff; }
    .chip input { accent-color: #2b6cb0; }
    .field-error { margin-top: 4px; font-size: 12px; color: #c0392b; /* $color-error: 5,44:1 */ }
  `],
})
export class FieldMultiSelectComponent implements OnInit {
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

  protected enumValues: string[] = [];

  ngOnInit() {
    const items = this.schema()['items'] as Record<string, unknown> | undefined;
    this.enumValues = (items?.['enum'] as string[]) ?? [];
  }

  protected selectedValue(): string[] {
    return (this.value() as string[]) ?? [];
  }

  protected isSelected(option: string): boolean {
    return this.selectedValue().includes(option);
  }

  protected toggle(option: string) {
    const current = this.selectedValue();
    const next = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option];
    this.valueChange.emit(next);
  }
}