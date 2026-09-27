import { Router, UrlTree } from '@angular/router';

import { AuthService } from '../services/auth.service';

/** Ruta de la pantalla que se muestra cuando el servidor no responde al restaurar la sesión. */
export const SERVER_UNAVAILABLE_PATH = '/sin-conexion';

/**
 * Adónde mandar a quien no tiene usuario en una ruta protegida.
 *
 * Si la sesión guardada no se pudo restaurar porque el servidor no respondió, va a la pantalla de
 * «sin conexión» con la URL pedida en `volver`, para retomarla al reintentar. Si no hay sesión o el
 * backend la rechazó, al login.
 */
export function redirectWithoutSession(auth: AuthService, router: Router, requestedUrl: string): UrlTree {
  if (auth.status() === 'unreachable') {
    return router.createUrlTree([SERVER_UNAVAILABLE_PATH], { queryParams: { volver: requestedUrl } });
  }
  return router.createUrlTree(['/login']);
}

/**
 * Devuelve `url` si es una ruta interna segura para volver, o `/` si no.
 *
 * Evita que `?volver=` se use para mandar a otro sitio (`//otro.com`, `https://…`) y que se vuelva
 * en bucle a la propia pantalla de «sin conexión».
 */
export function safeReturnUrl(url: string | null | undefined): string {
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/\\')) {
    return '/';
  }
  if (url === SERVER_UNAVAILABLE_PATH || url.startsWith(`${SERVER_UNAVAILABLE_PATH}?`)) {
    return '/';
  }
  return url;
}
