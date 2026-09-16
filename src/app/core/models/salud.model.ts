/** Respuesta de `GET /salud` del backend. */
export interface RespuestaSalud {
  estado: string;
  momento: string;
}

/**
 * Resultado de consultar la salud del backend.
 *
 * Es una unión discriminada y no un objeto con campos opcionales a propósito: obliga a contemplar el
 * caso de error en vez de permitir leer `momento` cuando no hubo conexión.
 */
export type ResultadoSalud =
  | { estado: 'conectado'; momento: string }
  | { estado: 'error'; motivo: string };
