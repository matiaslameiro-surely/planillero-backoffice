/** Esquema JSON Schema: el formulario usa solo las keywords simples que define el contrato. */
export type JsonSchema = Record<string, unknown>;

/** Modo de renderizado del formulario. */
export type FormMode = 'edit' | 'readonly';

/** Props base para cada componente de campo. */
export interface FormFieldComponent {
  /** Nombre del campo (clave en el objeto de respuestas). */
  name: string;
  /** Esquema JSON Schema de esta propiedad. */
  schema: JsonSchema;
  /** Valor actual del campo. */
  value: unknown;
  /** Evento de cambio. */
  valueChange: (value: unknown) => void;
  /** Evento blur. */
  blur: () => void;
  /** Error de validación actual. */
  error?: string;
  /** Si el campo ha sido tocado. */
  touched?: boolean;
  /** Si el formulario es de solo lectura. */
  readonly?: boolean;
  /** Etiqueta legible. */
  label?: string;
  /** Texto de ayuda. */
  description?: string;
  /** Si el campo es requerido. */
  required?: boolean;
}

/** Error de validación estructurado. */
export interface ValidationError {
  field: string;
  message: string;
  rejectedValue?: unknown;
}

/** Resultado de validación completa. */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  violations: ValidationError[];
}

/** Plantilla de formulario (lista). */
export interface FormTemplateListItem {
  id: string;
  key: string;
  version: number;
  name: string;
  description: string;
  createdAt: string;
}

/** Plantilla con schema completo. */
export interface FormTemplateDetail extends FormTemplateListItem {
  schema: JsonSchema;
}

/** Request para enviar formulario. */
export interface FormSubmissionRequest {
  templateKey: string;
  templateVersion: number;
  responses: Record<string, unknown>;
}

/** Response de envío. */
export interface FormSubmissionResponse {
  visitId: string;
  templateKey: string;
  templateVersion: number;
  submittedAt: string;
}

/** Visita con datos de formulario (para backoffice). */
export interface VisitWithForm {
  id: string;
  code: string;
  address: string;
  latitude: number;
  longitude: number;
  jurisdiction: string;
  status: string;
  urgency: string;
  createdAt: string;
  formTemplateId?: string;
  templateKey?: string;
  templateVersion?: number;
  templateName?: string;
  responses?: Record<string, unknown>;
  submittedAt?: string;
}