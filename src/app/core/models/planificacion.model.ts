/** Estado de una visita en su ciclo de vida. */
export type VisitStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

/** Urgencia de una visita; define el orden dentro de la hoja de ruta. */
export type VisitUrgency = 'LOW' | 'MEDIUM' | 'HIGH';

/** Operador, tal como lo devuelve `GET /api/v1/operators`. */
export interface Operator {
  id: string;
  username: string;
  jurisdiction: string;
}

/** Visita, tal como la devuelve `GET /api/v1/visits`. */
export interface Visit {
  id: string;
  code: string;
  address: string;
  latitude: number;
  longitude: number;
  status: VisitStatus;
  urgency: VisitUrgency;
  /**
   * El formulario de la visita llegó por sincronización diferida y no por la carga en línea.
   *
   * Es un dato de auditoría, no un problema: dice que el operador trabajó sin señal y que el acta
   * viajó después. Quien revisa el expediente necesita poder distinguirlo.
   */
  syncedDeferred: boolean;
  /** Cuándo se recibió esa sincronización, ISO-8601, o `null` si no la hubo. */
  syncedAt: string | null;
}

/** Hito de la hoja de ruta: una visita con su posición en el recorrido. */
export interface RouteSheetItem {
  position: number;
  visit: Visit;
}

/** Hoja de ruta de un operador para una fecha. */
export interface RouteSheet {
  operatorId: string;
  operatorUsername: string;
  date: string;
  items: RouteSheetItem[];
}

/** Cuerpo de `POST /api/v1/visits/assign`. */
export interface AssignRequest {
  operatorId: string;
  date: string;
  visitIds: string[];
}

/** Filtros opcionales de `GET /api/v1/visits`. */
export interface VisitFilters {
  status?: VisitStatus;
  urgency?: VisitUrgency;
  date?: string;
  operatorId?: string;
}