import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import type { DashboardSummary, OperatorLiveStatus } from '../models/supervision.model';

/**
 * Servicio de comunicación HTTP para el Tablero Central de Supervisión.
 */
@Injectable({ providedIn: 'root' })
export class SupervisionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/supervision`;

  /**
   * Resumen analítico de KPIs y alertas de excepciones operativas.
   */
  getTableroResumen(date?: string): Observable<DashboardSummary> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get<DashboardSummary>(`${this.base}/tablero-resumen`, { params });
  }

  /**
   * Listado en vivo de estados de operadores y telemetría.
   */
  getOperadoresEstado(date?: string): Observable<OperatorLiveStatus[]> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get<OperatorLiveStatus[]>(`${this.base}/operadores/estado`, { params });
  }
}
