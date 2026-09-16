/**
 * Entorno de desarrollo (el que usa `ng serve` por defecto).
 *
 * Los entornos se resuelven con `fileReplacements` en `angular.json`: el código importa siempre
 * `environment`, y el builder reemplaza el archivo según la configuración. No hay `if` de entorno
 * repartidos por el código.
 */
export const environment = {
  produccion: false,
  /** URL base del backend, sin barra final. */
  urlApi: 'http://localhost:8080',
};
