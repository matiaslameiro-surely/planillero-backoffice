import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { TokenStoreService } from '../services/token-store.service';

/**
 * Rutas que no llevan cabecera Bearer:
 * Diagnósticos de salud públicos y operaciones de autenticación.
 */
const PUBLIC_PATHS = [
  '/salud',
  '/health',
  '/auth/login',
  '/auth/verify-2fa',
  '/auth/refresh',
  '/auth/logout',
];

/** Margen de anticipación en segundos para renovar el token antes de su vencimiento. */
const REFRESH_MARGIN_SECONDS = 30;

/** Evalúa si corresponde renovar el token antes de enviar la petición. */
function shouldRefreshToken(store: TokenStoreService): boolean {
  if (!store.getRefreshToken()) {
    return false;
  }
  return store.isAccessTokenExpiring(REFRESH_MARGIN_SECONDS);
}

/** Verifica si la URL de la petición corresponde a un endpoint público. */
function isPublicUrl(url: string): boolean {
  const cleanUrl = url.split('?')[0];
  return PUBLIC_PATHS.some((path) => cleanUrl.endsWith(path));
}

/**
 * Interceptor de autenticación HTTP.
 *
 * Responsabilidades:
 * 1. No adjuntar `Authorization: Bearer` en endpoints públicos (/salud, /health, /auth/*).
 * 2. Renovar proactivamente el access token antes de que expire (con margen de 30s) si hay refresh token.
 * 3. Adjuntar `Authorization: Bearer` en peticiones protegidas.
 * 4. Como red de seguridad, capturar respuestas 401 para reintentar la petición una vez con refresh.
 *    Si la petición ya fue precedida por una renovación, ante un 401 propaga el error sin reintentar.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const store = inject(TokenStoreService);

  if (isPublicUrl(request.url)) {
    return next(request);
  }

  const sendWithToken = (token: string | null, options: { refreshed?: boolean } = {}) => {
    const authorized = token
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

    return next(authorized).pipe(
      catchError((error: unknown) => {
        if (options.refreshed || !(error instanceof HttpErrorResponse) || error.status !== 401) {
          return throwError(() => error);
        }
        return auth.refresh().pipe(
          switchMap((tokens) =>
            next(request.clone({ setHeaders: { Authorization: `Bearer ${tokens.accessToken}` } })),
          ),
        );
      }),
    );
  };

  if (shouldRefreshToken(store)) {
    return auth.refresh().pipe(
      switchMap((tokens) => sendWithToken(tokens.accessToken, { refreshed: true })),
    );
  }

  return sendWithToken(store.getAccessToken());
};
