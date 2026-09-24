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

interface JwtPayload {
  exp?: number;
  [key: string]: unknown;
}

/** Decodifica el payload de un JWT sin validar la firma. Devuelve null si no es un JWT válido. */
function parseJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) {
      base64 += '='.repeat(4 - pad);
    }
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload) as JwtPayload;
  } catch {
    return null;
  }
}

/** Determina si el token está por expirar dentro del margen establecido (o ya expiró). */
function isTokenExpiringSoon(token: string | null): boolean {
  if (!token) {
    return false;
  }
  const payload = parseJwt(token);
  if (!payload || typeof payload.exp !== 'number') {
    return false;
  }
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp - nowInSeconds <= REFRESH_MARGIN_SECONDS;
}

/** Evalúa si corresponde renovar el token antes de enviar la petición. */
function shouldRefreshToken(accessToken: string | null, refreshToken: string | null): boolean {
  if (!refreshToken) {
    return false;
  }
  if (!accessToken) {
    return true;
  }
  return isTokenExpiringSoon(accessToken);
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
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const store = inject(TokenStoreService);

  if (isPublicUrl(request.url)) {
    return next(request);
  }

  const sendWithToken = (token: string | null) => {
    const authorized = token
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
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

  const accessToken = store.getAccessToken();
  const refreshToken = store.getRefreshToken();

  if (shouldRefreshToken(accessToken, refreshToken)) {
    return auth.refresh().pipe(switchMap((tokens) => sendWithToken(tokens.accessToken)));
  }

  return sendWithToken(accessToken);
};
