import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import type {
  AssignRequest,
  Operator,
  RouteSheet,
  Visit,
  VisitFilters,
} from '../models/planificacion.model';

/**
 * Consultas de planificación contra el backend.
 *
 * Todos los endpoints requieren sesión con rol `SUPERVISOR`; el backend recorta cada respuesta a la
 * jurisdicción del usuario autenticado, así que acá no se manda ninguna zona.
 */
@Injectable({ providedIn: 'root' })
export class PlanificacionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1`;

  /** Operadores de la jurisdicción del supervisor, para los selectores. */
  getOperators(): Observable<Operator[]> {
    return this.http.get<Operator[]>(`${this.base}/operators`);
  }

  /** Hoja de ruta de un operador para una fecha. */
  getRouteSheet(operatorId: string, date: string): Observable<RouteSheet> {
    return this.http.get<RouteSheet>(`${this.base}/operators/${operatorId}/route-sheets`, {
      params: new HttpParams().set('date', date),
    });
  }

  /** Visitas de la jurisdicción, con filtros opcionales. */
  getVisits(filters?: VisitFilters): Observable<Visit[]> {
    let params = new HttpParams();
    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.urgency) {
      params = params.set('urgency', filters.urgency);
    }
    if (filters?.date) {
      params = params.set('date', filters.date);
    }
    if (filters?.operatorId) {
      params = params.set('operatorId', filters.operatorId);
    }
    return this.http.get<Visit[]>(`${this.base}/visits`, { params });
  }

  /** Asigna (o reasigna) visitas a un operador para una fecha. */
  assign(request: AssignRequest): Observable<RouteSheet> {
    return this.http.post<RouteSheet>(`${this.base}/visits/assign`, request);
  }
}