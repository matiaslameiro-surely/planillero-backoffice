/**
 * Fuente única de etiquetas para los códigos que manda el backend.
 *
 * El supervisor no tiene por qué leer `IN_PROGRESS` o `TAMPERED`: cada pantalla muestra el texto de
 * acá, nunca el código. Un código que no está en el mapa se devuelve tal cual, para que un valor
 * nuevo del backend se vea (y se note que falta traducirlo) en vez de quedar un hueco en la pantalla.
 */
export type LabelKind =
  | 'visitStatus'
  | 'visitUrgency'
  | 'shiftStatus'
  | 'exceptionType'
  | 'networkStatus'
  | 'evidenceType'
  | 'verificationStatus'
  | 'evidenceIntegrity'
  | 'entityType'
  | 'jurisdiction';

const LABELS: Readonly<Record<LabelKind, Readonly<Record<string, string>>>> = {
  visitStatus: {
    PENDING: 'Pendiente',
    ASSIGNED: 'Asignada',
    IN_PROGRESS: 'En curso',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
  },
  visitUrgency: {
    LOW: 'Baja',
    MEDIUM: 'Media',
    HIGH: 'Alta',
  },
  shiftStatus: {
    EN_CAMPO: 'En campo',
    DEMORADO: 'Demorado',
    OFFLINE: 'Sin conexión',
    TURNO_COMPLETO: 'Turno completo',
  },
  exceptionType: {
    OUT_OF_SLA: 'Fuera de SLA',
    OFFLINE: 'Sin conexión',
    LOW_BATTERY: 'Batería baja',
  },
  networkStatus: {
    ONLINE: 'En línea',
    OFFLINE: 'Sin conexión',
    UNKNOWN: 'Desconocida',
  },
  evidenceType: {
    PHOTO: 'Foto',
    SIGNATURE: 'Firma',
  },
  verificationStatus: {
    VERIFIED: 'Íntegro',
    TAMPERED: 'Adulterado',
    PENDING: 'Pendiente de verificación',
  },
  // Resultado por evidencia de la verificación del manifiesto (ManifestService en el backend).
  evidenceIntegrity: {
    INTACT: 'Íntegra',
    TAMPERED: 'Adulterada',
    MISSING_RECORD: 'Falta el registro',
    MISSING_FILE: 'Falta el archivo',
  },
  entityType: {
    VISIT: 'Visita',
  },
  // Jurisdicciones del seed; una nueva se ve cruda hasta que se agregue acá.
  jurisdiction: {
    ZONA_NORTE: 'Zona Norte',
    ZONA_SUR: 'Zona Sur',
    GLOBAL: 'Global',
  },
};

export function labelFor(kind: LabelKind, code: string | null | undefined): string {
  if (!code) {
    return '';
  }
  return LABELS[kind][code] ?? code;
}
