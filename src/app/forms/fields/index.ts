export { FieldTextComponent } from './field-text.component';
export { FieldSelectComponent } from './field-select.component';
export { FieldMultiSelectComponent } from './field-multiselect.component';
export { FieldNumberComponent } from './field-number.component';
export { FieldBooleanComponent } from './field-boolean.component';
export { EMPTY_READONLY_VALUE, READONLY_ATTRIBUTE, READONLY_STYLES } from './readonly-contract';

export function getFieldType(schema: Record<string, unknown>): string {
  const type = schema['type'] as string | undefined;
  const isEnum = Array.isArray(schema['enum']) && (schema['enum'] as unknown[]).length > 0;
  const items = schema['items'] as Record<string, unknown> | undefined;
  const itemType = items?.['type'] as string | undefined;

  if (type === 'string' && isEnum) return 'select';
  if (type === 'array' && itemType === 'string' && Array.isArray(items?.['enum'])) return 'multiselect';
  if (type === 'boolean') return 'boolean';
  if (type === 'number' || type === 'integer') return 'number';
  if (type === 'string') return 'text';
  return 'text';
}

export type FieldType = 'text' | 'select' | 'multiselect' | 'number' | 'boolean';