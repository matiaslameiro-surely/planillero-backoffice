/**
 * Entorno de producción. Reemplaza a `environment.ts` en el build de producción.
 *
 * La URL todavía es la local porque el backend no está desplegado en ningún servidor: cuando lo esté,
 * este es el archivo a tocar.
 */
export const environment = {
  produccion: true,
  urlApi: 'http://localhost:8080',
};
