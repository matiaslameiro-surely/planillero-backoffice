import { environment } from '../environments/environment';

/**
 * Texto que identifica el backend con el que habla la aplicación, para mostrárselo a la persona.
 *
 * En el build de Docker `apiUrl` es una cadena vacía (mismo origen: NGINX proxya la API), y mostrarla
 * tal cual dejaría un texto en blanco o un mensaje como «No se pudo conectar con .». Ahí el backend
 * es, para el navegador, el propio origen de la página.
 *
 * @param apiUrl URL configurada; por defecto la del entorno. Es parámetro para poder probarla sin mocks.
 */
export function apiOriginLabel(apiUrl: string = environment.apiUrl): string {
  return apiUrl || window.location.origin;
}
