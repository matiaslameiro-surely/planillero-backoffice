import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { TokenStoreService } from '../services/token-store.service';

/** Rutas que no llevan Bearer: son las que se usan justamente para obtener o renovar la sesión. */
const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/verify-2fa', '/auth/refresh'];

/**
 * Adjunta el Bearer y renueva la sesión ante un 401.
 *
 * Ante un 401 reintenta la petición una sola vez con el token renovado. Si el refresh falla, el
 * servicio de autenticación cierra la sesión y el error sigue su curso.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const store = inject(TokenStoreService);

  if (PUBLIC_AUTH_PATHS.some((path) => request.url.endsWith(path))) {
    return next(request);
  }

  const accessToken = store.getAccessToken();
  const authorized = accessToken
    ? request.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
    : request;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
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
