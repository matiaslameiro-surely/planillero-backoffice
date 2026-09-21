import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  FieldBooleanComponent,
  FieldMultiSelectComponent,
  FieldNumberComponent,
  FieldSelectComponent,
  FieldTextComponent,
  getFieldType,
} from './fields';
import { ValidationService } from './validation.service';
import type { FormMode, JsonSchema } from './types';

/** Configuración de un campo del formulario, derivada del JSON Schema. */
interface FieldConfig {
  name: string;
  type: string;
  schema: JsonSchema;
  label: string;
  description: string;
  required: boolean;
}

/**
 * Renderizador dinámico de formularios tipificados.
 *
 * Recibe el JSON Schema de una plantilla (contrato `03-contrato-api.md`) y renderiza cada
 * propiedad con el componente de campo adecuado según su tipo. Soporta los modos `edit` (con
 * envío) y `readonly` (expediente digital). La validación corre sobre `ValidationService` (ajv).
 */
@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FieldTextComponent,
    FieldSelectComponent,
    FieldMultiSelectComponent,
    FieldNumberComponent,
    FieldBooleanComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dynamic-form">
      @if (fields().length === 0) {
        <div class="empty-form">Este formulario no tiene campos definidos.</div>
      } @else {
        <div class="form-fields">
          @for (field of fields(); track field.name) {
            <div class="field-wrapper">
              @switch (field.type) {
                @case ('text') {
                  <app-field-text
                    [name]="field.name"
                    [schema]="field.schema"
                    [value]="values()[field.name]"
                    [label]="field.label"
                    [description]="field.description"
                    [required]="field.required"
                    [error]="errors()[field.name]"
                    [touched]="touched()[field.name]"
                    [readonly]="isReadonly()"
                    (valueChange)="onValueChange(field.name, $event)"
                    (blurEvent)="onBlur(field.name)"
                  />
                }
                @case ('select') {
                  <app-field-select
                    [name]="field.name"
                    [schema]="field.schema"
                    [value]="values()[field.name]"
                    [label]="field.label"
                    [description]="field.description"
                    [required]="field.required"
                    [error]="errors()[field.name]"
                    [touched]="touched()[field.name]"
                    [readonly]="isReadonly()"
                    (valueChange)="onValueChange(field.name, $event)"
                    (blurEvent)="onBlur(field.name)"
                  />
                }
                @case ('multiselect') {
                  <app-field-multiselect
                    [name]="field.name"
                    [schema]="field.schema"
                    [value]="values()[field.name]"
                    [label]="field.label"
                    [description]="field.description"
                    [required]="field.required"
                    [error]="errors()[field.name]"
                    [touched]="touched()[field.name]"
                    [readonly]="isReadonly()"
                    (valueChange)="onValueChange(field.name, $event)"
                    (blurEvent)="onBlur(field.name)"
                  />
                }
                @case ('number') {
                  <app-field-number
                    [name]="field.name"
                    [schema]="field.schema"
                    [value]="values()[field.name]"
                    [label]="field.label"
                    [description]="field.description"
                    [required]="field.required"
                    [error]="errors()[field.name]"
                    [touched]="touched()[field.name]"
                    [readonly]="isReadonly()"
                    (valueChange)="onValueChange(field.name, $event)"
                    (blurEvent)="onBlur(field.name)"
                  />
                }
                @case ('boolean') {
                  <app-field-boolean
                    [name]="field.name"
                    [schema]="field.schema"
                    [value]="values()[field.name]"
                    [label]="field.label"
                    [description]="field.description"
                    [required]="field.required"
                    [error]="errors()[field.name]"
                    [touched]="touched()[field.name]"
                    [readonly]="isReadonly()"
                    (valueChange)="onValueChange(field.name, $event)"
                    (blurEvent)="onBlur(field.name)"
                  />
                }
              }
            </div>
          }
        </div>

        @if (mode() === 'edit') {
          <div class="form-actions">
            <button
              type="button"
              class="btn-submit"
              (click)="onSubmit()"
              [disabled]="submitting()">
              {{ submitLabel() }}
            </button>
            @if (submitting()) {
              <span class="spinner" aria-hidden="true"></span>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .dynamic-form { padding: 16px; }
    .empty-form { padding: 16px; text-align: center; color: #718096; }
    .form-fields { display: flex; flex-direction: column; gap: 16px; }
    .form-actions { display: flex; align-items: center; gap: 12px; margin-top: 24px; }
    .btn-submit {
      min-height: 48px; min-width: 48px;
      padding: 12px 24px;
      border: none; border-radius: 8px;
      background: #2b6cb0; color: #fff;
      font-size: 16px; font-weight: 600; cursor: pointer;
    }
    .btn-submit:disabled { background: #a0c4e8; cursor: not-allowed; }
    .spinner {
      width: 20px; height: 20px;
      border: 2px solid #cbd5e0; border-top-color: #2b6cb0;
      border-radius: 50%; animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class DynamicFormComponent {
  readonly schema = input.required<JsonSchema>();
  readonly initialValues = input<Record<string, unknown>>({});
  readonly mode = input<FormMode>('edit');
  readonly submitLabel = input<string>('Enviar');
  readonly submitting = input<boolean>(false);
  readonly formSubmit = output<Record<string, unknown>>();

  private readonly validationService = inject(ValidationService);

  protected readonly values = signal<Record<string, unknown>>({});
  protected readonly touched = signal<Record<string, boolean>>({});
  protected readonly errors = signal<Record<string, string>>({});

  protected readonly isReadonly = computed(() => this.mode() === 'readonly');

  /** Cada propiedad del schema se convierte en la config de un campo a renderizar. */
  protected readonly fields = computed<FieldConfig[]>(() => {
    const schema = this.schema();
    const properties = (schema['properties'] as Record<string, JsonSchema> | undefined) ?? {};
    const required = Array.isArray(schema['required']) ? (schema['required'] as string[]) : [];
    return Object.entries(properties).map(([name, fieldSchema]) => ({
      name,
      type: getFieldType(fieldSchema),
      schema: fieldSchema,
      label: (fieldSchema['title'] as string | undefined) ?? name,
      description: (fieldSchema['description'] as string | undefined) ?? '',
      required: required.includes(name),
    }));
  });

  constructor() {
    // Sincroniza los valores iniciales cuando la plantilla o la visita cambian.
    effect(() => {
      this.values.set({ ...this.initialValues() });
      this.touched.set({});
      this.errors.set({});
    });
  }

  protected onValueChange(name: string, value: unknown): void {
    this.values.update((vals) => ({ ...vals, [name]: value }));
  }

  protected onBlur(name: string): void {
    this.touched.update((t) => ({ ...t, [name]: true }));
    const message = this.validationService.validateField(
      this.schema(),
      name,
      this.values()[name],
    );
    this.errors.update((errs) => ({ ...errs, [name]: message ?? '' }));
  }

  protected onSubmit(): void {
    const result = this.validationService.validate(this.schema(), this.values());
    if (!result.isValid) {
      this.errors.set(result.errors);
      this.touched.update((t) => ({ ...t, ...markAllTouched(result.errors) }));
      return;
    }
    this.formSubmit.emit(this.values());
  }
}

/** Devuelve un mapa que marca como tocados todos los campos con error. */
function markAllTouched(errors: Record<string, string>): Record<string, boolean> {
  const touched: Record<string, boolean> = {};
  for (const key of Object.keys(errors)) {
    touched[key] = true;
  }
  return touched;
}