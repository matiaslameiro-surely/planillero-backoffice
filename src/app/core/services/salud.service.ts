import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, timeout } from 'rxjs';

import { environment } from '../../environments/environment';
import type { RespuestaSalud, ResultadoSalud } from '../models/salud.model';

/** Milisegundos antes de dar por perdida la consulta. */
const TIMEOUT_MS = 10_000;

/**
 * Consulta el estado del backend.
 *
 * Usa `HttpClient` y no `fetch` porque es lo que permite sumar interceptors cuando llegue la
 * autenticación, sin tocar este servicio.
 */
@Injectable({ providedIn: 'root' })
export class SaludService {
  private readonly http = inject(HttpClient);

  /**
   * Consulta `GET /salud`.
   *
   * Nunca emite un error: un backend caído es un estado esperado de la aplicación, no una excepción.
   * Quien se suscribe recibe siempre un `ResultadoSalud` y decide qué mostrar.
   */
  obtenerSalud(): Observable<ResultadoSalud> {
    return this.http.get<RespuestaSalud>(`${environment.urlApi}/salud`).pipe(
      timeout(TIMEOUT_MS),
      map((cuerpo): ResultadoSalud => {
        if (cuerpo?.estado !== 'ok') {
          return {
            estado: 'error',
            motivo: `El backend informó estado "${cuerpo?.estado ?? 'desconocido'}".`,
          };
        }
        return { estado: 'conectado', momento: cuerpo.momento ?? '' };
      }),
      catchError((error: unknown) => of(this.traducirError(error))),
    );
  }

  private traducirError(error: unknown): ResultadoSalud {
    // `status: 0` es la señal de que la petición no llegó a destino: backend caído, DNS, CORS.
    const status = (error as { status?: number })?.status;
    if (typeof status === 'number' && status > 0) {
      return { estado: 'error', motivo: `El backend respondió ${status}.` };
    }
    return { estado: 'error', motivo: `No se pudo conectar con ${environment.urlApi}.` };
  }
}
