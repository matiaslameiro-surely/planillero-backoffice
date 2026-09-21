import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import type {
  AuditLogFilters,
  AuditLogPage,
  ChainVerificationResult,
} from '../models/audit.model';

/**
 * Consultas de auditoría contra el backend.
 *
 * Los dos endpoints exigen rol `ADMINISTRATOR`; el backend responde 403 para cualquier otro rol, así
 * que acá no hay lógica de permisos: la guarda de la ruta ya se ocupó de eso.
 */
@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/audit`;

  /** Página de eventos de auditoría, con filtros opcionales. */
  getLogs(filters?: AuditLogFilters): Observable<AuditLogPage> {
    let params = new HttpParams();
    if (filters?.eventType) {
      params = params.set('eventType', filters.eventType);
    }
    if (filters?.username) {
      params = params.set('username', filters.username);
    }
    if (filters?.from) {
      params = params.set('from', filters.from);
    }
    if (filters?.to) {
      params = params.set('to', filters.to);
    }
    params = params.set('page', filters?.page ?? 0).set('size', filters?.size ?? 20);
    return this.http.get<AuditLogPage>(`${this.base}/logs`, { params });
  }

  /** Verifica la cadena de hashes completa, o el segmento de una visita puntual. */
  verify(visitId?: string): Observable<ChainVerificationResult> {
    let params = new HttpParams();
    if (visitId) {
      params = params.set('visitId', visitId);
    }
    return this.http.get<ChainVerificationResult>(`${this.base}/verify`, { params });
  }
}
