/** Fila de auditoría, tal como la devuelve `GET /api/v1/audit/logs`. */
export interface AuditLogEntry {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string | null;
  username: string;
  ip: string | null;
  deviceId: string | null;
  payload: string;
  createdAt: string;
}

/** Página de resultados al estilo `org.springframework.data.domain.Page`. */
export interface AuditLogPage {
  content: AuditLogEntry[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/** Filtros opcionales de `GET /api/v1/audit/logs`. */
export interface AuditLogFilters {
  eventType?: string;
  username?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

/** Resultado de `GET /api/v1/audit/verify`. */
export interface ChainVerificationResult {
  intacta: boolean;
  primerEslabonRotoId: string | null;
  motivo: string | null;
}
