import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { READONLY_ATTRIBUTE, READONLY_STYLES } from './readonly-contract';

@Component({
  selector: 'app-field-boolean',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="field-container" [attr.${READONLY_ATTRIBUTE}]="readonly() ? '' : null">
      <div class="boolean-row">
        <div class="label-wrapper">
          <!-- El texto está fuera del <label> por el diseño (texto a la izquierda, interruptor a la
               derecha); aria-labelledby lo vincula al checkbox para que el lector lo anuncie. -->
          <span class="field-label" [id]="labelId">
            {{ label() }}
            @if (required() && !readonly()) {
              <span class="required" aria-hidden="true"> *</span>
            }
          </span>
          @if (description()) {
            <p class="field-description" [id]="descriptionId">{{ description() }}</p>
          }
        </div>
        <label class="switch-label" [for]="checkboxId">
          <input
            [id]="checkboxId"
            [attr.aria-labelledby]="labelId"
            [attr.aria-describedby]="description() ? descriptionId : null"
            [attr.aria-required]="required() && !readonly() ? 'true' : null"
            type="checkbox"
            [checked]="value() ?? false"
            (change)="onChange($event)"
            (blur)="blurEvent.emit()"
            [disabled]="readonly()"
            class="switch-input"
          />
          <span class="switch-slider"></span>
        </label>
      </div>
      @if (touched() && error()) {
        <div class="field-error">{{ error() }}</div>
      }
    </div>
  `,
  styles: [`
    .field-container { margin-bottom: 16px; }
    .boolean-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .label-wrapper { flex: 1; }
    .field-label { display: block; font-size: 14px; font-weight: 600; color: var(--color-text); }
    .required { color: var(--color-error); }
    .field-description { font-size: 12px; color: var(--color-text-muted); margin: 2px 0 0; }
    .switch-label { position: relative; display: inline-block; width: 52px; height: 28px; cursor: pointer; }
    .switch-input { opacity: 0; /* allow-opacity: checkbox nativo oculto para accesibilidad */ width: 0; height: 0; position: absolute; }
    .switch-slider {
      position: absolute; cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: var(--color-border-strong);
      border-radius: 28px;
      transition: 0.3s;
    }
    .switch-slider:before {
      position: absolute; content: ""; height: 20px; width: 20px;
      left: 4px; bottom: 4px; background-color: var(--color-surface);
      border-radius: 50%; transition: 0.3s;
    }
    input:checked + .switch-slider { background-color: var(--color-primary); }
    input:checked + .switch-slider:before { transform: translateX(24px); }
    .field-error { margin-top: 4px; font-size: 12px; color: var(--color-error); }
    ${READONLY_STYLES}

    /* El interruptor visible es un <span> decorativo, no un control, así que el contrato no lo
       alcanza. Lo único que hay que sacarle es el cursor: el contrato ya se lo saca al <label> que
       lo envuelve.

       Deliberadamente NO se le pone la superficie de solo lectura. El expediente muestra el
       formulario dentro de .form-section, que ya es --color-surface-muted: un riel de ese mismo color
       queda en 1,00:1 contra la sección, y un interruptor apagado se dibuja como un vacío, que es
       indistinguible de "el campo no se renderizó". El riel conserva su color, y el estado
       encendido y apagado quedan legibles: el interruptor informa del estado, no de una acción. */
    [data-readonly] .switch-label { cursor: default; }
    [data-readonly] .switch-slider { cursor: default; }
  `],
})
export class FieldBooleanComponent {
  name = input.required<string>();
  schema = input.required<Record<string, unknown>>();
  value = input<unknown>(false);
  valueChange = output<boolean>();
  blurEvent = output<void>();
  error = input<string>();
  touched = input<boolean>(false);
  readonly = input<boolean>(false);
  label = input<string>();
  description = input<string>();
  required = input<boolean>(false);

  protected checkboxId = `field-boolean-${crypto.randomUUID().slice(0, 8)}`;
  protected labelId = `${this.checkboxId}-label`;
  protected descriptionId = `${this.checkboxId}-description`;

  protected onChange(event: Event): void {
    if (this.readonly()) {
      return;
    }
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.checked);
  }
}
