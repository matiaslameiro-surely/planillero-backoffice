import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

/**
 * Composition root de la aplicación: acá se registran los proveedores globales.
 *
 * `provideHttpClient` va con `withFetch` porque es la implementación recomendada y la que permite
 * sumar interceptors funcionales cuando llegue la autenticación.
 */
export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideRouter(routes), provideHttpClient(withFetch())],
};
