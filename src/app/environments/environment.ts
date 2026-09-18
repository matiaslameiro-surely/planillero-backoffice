/**
 * Entorno de desarrollo (el que usa `ng serve` por defecto).
 *
 * Los entornos se resuelven con `fileReplacements` en `angular.json`: el código importa siempre
 * `environment`, y el builder reemplaza el archivo según la configuración. No hay `if` de entorno
 * repartidos por el código.
 */
export const environment = {
  production: false,
  /** URL base del backend, sin barra final. */
  apiUrl: 'http://localhost:8080',
};
