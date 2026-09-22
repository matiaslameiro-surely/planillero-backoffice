/**
 * Entorno del build de Docker (`ng build --configuration docker`).
 *
 * `apiUrl` vacío significa **mismo origen**: el bundle llama a rutas relativas (`/api/v1/...`,
 * `/salud`) y NGINX las proxya al backend. Así la imagen no depende de en qué host o puerto se
 * publique, y no hace falta CORS en el backend.
 */
export const environment = {
  production: true,
  apiUrl: '',
};
