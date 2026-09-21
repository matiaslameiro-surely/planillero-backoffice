import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, timeout } from 'rxjs';

import { environment } from '../../environments/environment';
import { apiOriginLabel } from '../api-origin';
import type { HealthResponse, HealthResult } from '../models/health.model';

/** Milisegundos antes de dar por perdida la consulta. */
const TIMEOUT_MS = 10_000;

/**
 * Consulta el estado del backend.
 *
 * Usa `HttpClient` y no `fetch` porque es lo que permite sumar interceptors sin tocar este servicio.
 */
@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);

  /**
   * Consulta `GET /salud`.
   *
   * Nunca emite un error: un backend caído es un estado esperado de la aplicación, no una excepción.
   * Quien se suscribe recibe siempre un `HealthResult` y decide qué mostrar.
   */
  getHealth(): Observable<HealthResult> {
    return this.http.get<HealthResponse>(`${environment.apiUrl}/salud`).pipe(
      timeout(TIMEOUT_MS),
      map((body): HealthResult => {
        if (body?.estado !== 'ok') {
          return {
            status: 'error',
            reason: `El backend informó estado "${body?.estado ?? 'desconocido'}".`,
          };
        }
        return { status: 'connected', at: body.momento ?? '' };
      }),
      catchError((error: unknown) => of(this.translateError(error))),
    );
  }

  private translateError(error: unknown): HealthResult {
    // `status: 0` es la señal de que la petición no llegó a destino: backend caído, DNS, CORS.
    const status = (error as { status?: number })?.status;
    if (typeof status === 'number' && status > 0) {
      return { status: 'error', reason: `El backend respondió ${status}.` };
    }
    return { status: 'error', reason: `No se pudo conectar con ${apiOriginLabel()}.` };
  }
}
