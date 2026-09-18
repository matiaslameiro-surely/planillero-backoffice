/** Respuesta de `GET /salud`. Las claves son las del backend y no se traducen. */
export interface HealthResponse {
  estado: string;
  momento: string;
}

/**
 * Resultado de consultar la salud del backend.
 *
 * Es una unión discriminada y no un objeto con campos opcionales a propósito: obliga a contemplar el
 * caso de error en vez de permitir leer la hora cuando no hubo conexión.
 */
export type HealthResult =
  | { status: 'connected'; at: string }
  | { status: 'error'; reason: string };
