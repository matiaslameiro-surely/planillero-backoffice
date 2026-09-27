import { Injectable } from '@angular/core';
// Draft 2020-12: es el que declaran las plantillas del backend. La clase por defecto de 'ajv' sólo
// conoce Draft-07 y falla al compilar un schema con ese $schema (PLAN-75).
import Ajv from 'ajv/dist/2020';
import type { ErrorObject, ValidateFunction } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import type { JsonSchema, ValidationError, ValidationResult } from './types';

@Injectable({ providedIn: 'root' })
export class ValidationService {
  private ajv = new Ajv({
    allErrors: true,
    strict: false,
    coerceTypes: 'array',
  });
  private validateCache = new Map<string, ValidateFunction>();

  constructor() {
    addFormats(this.ajv);
  }

  private getValidator(schema: JsonSchema): ValidateFunction {
    const key = JSON.stringify(schema);
    let validate = this.validateCache.get(key);
    if (!validate) {
      validate = this.ajv.compile(schema);
      this.validateCache.set(key, validate);
    }
    return validate;
  }

  private mapAjvErrors(errors: ErrorObject[] | null | undefined): ValidationError[] {
    if (!errors || errors.length === 0) return [];
    return errors.map((e) => ({
      field: e.instancePath || (e.schemaPath ? `#/${e.schemaPath.split('/').slice(1).join('/')}` : ''),
      message: this.ajvErrorMessage(e),
      rejectedValue: e.data,
    }));
  }

  private ajvErrorMessage(e: ErrorObject): string {
    const field = e.instancePath.replace('/', '') || 'campo';
    const params = e.params as Record<string, unknown>;

    switch (e.keyword) {
      case 'required':
        return `El campo "${params['missingProperty'] ?? field}" es obligatorio.`;
      case 'type':
        return `El campo "${field}" debe ser de tipo ${e.params['type']}.`;
      case 'enum':
        return `El campo "${field}" debe ser uno de: ${(params['allowedValues'] as unknown[]).join(', ')}.`;
      case 'minimum':
        return `El campo "${field}" debe ser ≥ ${params['limit']}.`;
      case 'maximum':
        return `El campo "${field}" debe ser ≤ ${params['limit']}.`;
      case 'exclusiveMinimum':
        return `El campo "${field}" debe ser > ${params['limit']}.`;
      case 'exclusiveMaximum':
        return `El campo "${field}" debe ser < ${params['limit']}.`;
      case 'minLength':
        return `El campo "${field}" debe tener al menos ${params['limit']} caracteres.`;
      case 'maxLength':
        return `El campo "${field}" no puede exceder ${params['limit']} caracteres.`;
      case 'pattern':
        return `El campo "${field}" no tiene el formato esperado.`;
      case 'format':
        return `El campo "${field}" no tiene un formato válido (${params['format']}).`;
      case 'additionalProperties':
        return `El campo "${params['additionalProperty']}" no está permitido.`;
      default:
        return e.message ?? `Valor inválido en "${field}".`;
    }
  }

  validate(schema: JsonSchema, data: unknown): ValidationResult {
    const validate = this.getValidator(schema);
    const valid = validate(data);
    const violations = this.mapAjvErrors(validate.errors);
    const errors: Record<string, string> = {};
    for (const v of violations) {
      const key = v.field.startsWith('/') ? v.field.slice(1) : v.field;
      errors[key] = v.message;
    }
    return { isValid: valid, errors, violations };
  }

  validateField(schema: JsonSchema, fieldName: string, value: unknown): string | undefined {
    const properties = schema['properties'] as Record<string, JsonSchema> | undefined;
    const fieldSchema = properties?.[fieldName];
    if (!fieldSchema) return undefined;

    const required = Array.isArray(schema['required']) ? (schema['required'] as string[]) : [];
    const validate = this.getValidator({
      type: 'object',
      properties: { [fieldName]: fieldSchema },
      required: required.includes(fieldName) ? [fieldName] : [],
      additionalProperties: false,
    });

    const valid = validate({ [fieldName]: value });
    if (valid) return undefined;

    const violations = this.mapAjvErrors(validate.errors);
    return violations[0]?.message;
  }
}