/** Tono semántico del badge de un tipo de evento; cada uno tiene su color en `auditoria.scss`. */
export type AuditEventTone = 'primary' | 'success' | 'warning' | 'info';

export interface AuditEventTypeInfo {
  /** Código tal como lo emite el backend. */
  code: string;
  /** Nombre legible para el administrador. */
  label: string;
  /** Explicación breve, se muestra como tooltip. */
  description: string;
  tone: AuditEventTone;
}

/** Tipos de evento que registra el backend en `audit_logs`. */
export const AUDIT_EVENT_TYPES: readonly AuditEventTypeInfo[] = [
  {
    code: 'VISIT_ASSIGNED',
    label: 'Visita asignada',
    description: 'Un administrador asignó la visita a un operador.',
    tone: 'primary',
  },
  {
    code: 'VISIT_STARTED',
    label: 'Visita iniciada',
    description: 'El operador inició la visita en campo, con GPS y hora del servidor.',
    tone: 'success',
  },
  {
    code: 'FORM_SUBMITTED',
    label: 'Formulario enviado',
    description: 'El operador envió el formulario de la visita.',
    tone: 'info',
  },
  {
    code: 'EVIDENCE_SAVED',
    label: 'Evidencia guardada',
    description: 'Se guardó una evidencia (por ejemplo, una foto) asociada a la visita.',
    tone: 'warning',
  },
  {
    code: 'VISIT_COMPLETED',
    label: 'Visita completada',
    description: 'El operador finalizó la visita en campo.',
    tone: 'success',
  },
  {
    code: 'MANIFEST_SIGNED',
    label: 'Manifiesto firmado',
    description: 'Se firmó el manifiesto de la visita; cierra la cadena de custodia.',
    tone: 'success',
  },
];

/** Explicación de los tipos de entidad que aparecen en la grilla. */
export const AUDIT_ENTITY_TYPE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  VISIT: 'Visita de campo sobre la que se registró el evento.',
};

export function eventTypeInfo(code: string): AuditEventTypeInfo | undefined {
  return AUDIT_EVENT_TYPES.find((type) => type.code === code);
}
