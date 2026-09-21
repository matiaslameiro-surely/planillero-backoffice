/**
 * Modelos para el módulo de Supervisión Central, Mapa Operativo y Monitoreo de Excepciones.
 */

export type ShiftStatus = 'EN_CAMPO' | 'DEMORADO' | 'OFFLINE' | 'TURNO_COMPLETO';

export type ExceptionSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SupervisionException {
  operatorId: string;
  operatorUsername: string;
  type: string;
  severity: ExceptionSeverity;
  message: string;
  detectedAt: string;
}

export interface DashboardSummary {
  date: string;
  jurisdiction: string;
  totalOperators: number;
  inFieldOperators: number;
  delayedOperators: number;
  offlineOperators: number;
  completedShiftOperators: number;
  totalVisits: number;
  pendingVisits: number;
  inProgressVisits: number;
  completedVisits: number;
  slaComplianceRate: number;
  exceptions: SupervisionException[];
}

export interface OperatorLiveStatus {
  operatorId: string;
  username: string;
  jurisdiction: string;
  status: ShiftStatus;
  batteryLevel: number | null;
  networkStatus: string;
  lastHeartbeatAt: string;
  lastLatitude: number | null;
  lastLongitude: number | null;
  assignedVisitsCount: number;
  completedVisitsCount: number;
  activeVisitCode: string | null;
  activeVisitAddress: string | null;
  activeVisitElapsedMinutes: number | null;
  slaStatus: string;
  observations: string | null;
}
