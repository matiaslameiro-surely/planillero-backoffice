import { HttpErrorResponse } from '@angular/common/http';

/**
 * Traduce el error de un pedido sobre una visita puntual al mensaje que ve el supervisor.
 *
 * Desde PLAN-49 y PLAN-51 el backend distingue «no tenés acceso» (`403`, por jurisdicción o por
 * asignación) de «no existe» (`404`). Para la pantalla los dos `403` significan lo mismo, así que se
 * decide por status y no por código de error.
 *
 * @returns el mensaje, o `null` si el error no es de acceso ni de existencia y cada pantalla tiene
 *          que usar su propio mensaje genérico
 */
export function visitAccessMessage(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }
  if (error.status === 403) {
    return 'No tenés acceso a esta visita.';
  }
  if (error.status === 404) {
    return 'La visita no existe.';
  }
  return null;
}

/** Código de error estable del cuerpo de la respuesta (`{ error, message }`), si lo trae. */
export function apiErrorCode(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }
  const body = error.error as { error?: unknown } | null;
  return typeof body?.error === 'string' ? body.error : null;
}
