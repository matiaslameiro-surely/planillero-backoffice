import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

import { environment } from '../../environments/environment';
import type { LoginResult, SessionUser, Tokens } from '../models/auth.model';
import { TokenStoreService } from './token-store.service';

/**
 * Estado de la sesión. `loading` es el arranque, mientras se intenta restaurar la sesión guardada.
 * `unreachable` significa que hay una sesión guardada pero el servidor no respondió al restaurarla:
 * no se sabe todavía si es válida, así que no se descarta.
 */
export type SessionStatus = 'loading' | 'signedOut' | 'signedIn' | 'unreachable';

/**
 * Indica si un error significa que el servidor no está disponible (sin red o 5xx), a diferencia de
 * un rechazo de la sesión (4xx). Sólo el rechazo justifica borrar el refresh token: lo otro puede
 * resolverse solo cuando el servidor vuelva.
 */
export function isServerUnavailable(error: unknown): boolean {
  return error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500);
}

/** Respuesta cruda de `POST /api/v1/auth/login`. */
interface LoginResponse {
  twoFactorRequired: boolean;
  challengeId?: string;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Servicio de autenticación del backoffice.
 *
 * Es el único lugar que sabe cómo se inicia, renueva y cierra una sesión. El interceptor y las
 * guardas se apoyan en él; las pantallas no tocan tokens.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(TokenStoreService);

  /** Usuario autenticado, o `null` si no hay sesión. */
  readonly user = signal<SessionUser | null>(null);
  /** Estado de la sesión, para que la UI sepa si todavía está restaurando. */
  readonly status = signal<SessionStatus>('loading');

  private refreshInFlight$: Observable<Tokens> | null = null;
  private restoreInFlight$: Observable<SessionUser | null> | null = null;

  /** Inicia sesión con usuario y contraseña. */
  login(username: string, password: string): Observable<LoginResult> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/api/v1/auth/login`, { username, password })
      .pipe(
        map((response): LoginResult => {
          if (response.twoFactorRequired) {
            if (!response.challengeId) {
              throw new Error('El backend pidió 2FA pero no envió el desafío.');
            }
            return { twoFactorRequired: true, challengeId: response.challengeId };
          }
          return {
            twoFactorRequired: false,
            tokens: {
              accessToken: response.accessToken ?? '',
              refreshToken: response.refreshToken ?? '',
            },
          };
        }),
      );
  }

  /** Guarda los tokens y carga el usuario. Cierra el login cuando no hay 2FA. */
  startSession(tokens: Tokens): Observable<SessionUser> {
    this.store.set(tokens);
    return this.fetchUser();
  }

  /** Completa el login con el código TOTP, guarda los tokens y carga el usuario. */
  verifyTwoFactor(challengeId: string, code: string): Observable<SessionUser> {
    return this.http
      .post<Tokens>(`${environment.apiUrl}/api/v1/auth/verify-2fa`, { challengeId, code })
      .pipe(switchMap((tokens) => this.startSession(tokens)));
  }

  /**
   * Restaura la sesión si hace falta y devuelve el usuario.
   *
   * Es lo que usan las guardas: al entrar a una ruta protegida, si todavía no hay usuario intenta
   * `GET /api/v1/auth/me` con el refresh token guardado. Si el servidor no responde, devuelve `null`
   * con el estado en `unreachable` y conserva el refresh token para reintentar.
   */
  ensureSession(): Observable<SessionUser | null> {
    if (this.status() === 'signedIn') {
      return of(this.user());
    }
    if (!this.store.getRefreshToken()) {
      this.clearSession();
      return of(null);
    }
    if (!this.restoreInFlight$) {
      this.restoreInFlight$ = this.fetchUser().pipe(
        catchError((error: unknown) => {
          if (isServerUnavailable(error)) {
            this.status.set('unreachable');
          } else {
            this.clearSession();
          }
          return of(null);
        }),
        finalize(() => {
          this.restoreInFlight$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.restoreInFlight$;
  }

  /**
   * Renueva la sesión con el refresh token.
   *
   * Comparte una sola petición entre todos los que la pidan a la vez: si varias respuestas llegan
   * con 401 al mismo tiempo, se golpea `/api/v1/auth/refresh` una vez y no una por request.
   * Sólo descarta la sesión si el backend la rechaza; si no responde, el error se propaga sin tocarla.
   */
  refresh(): Observable<Tokens> {
    if (!this.refreshInFlight$) {
      const refreshToken = this.store.getRefreshToken();
      if (!refreshToken) {
        this.clearSession();
        return throwError(() => new Error('No hay refresh token.'));
      }
      this.refreshInFlight$ = this.http
        .post<Tokens>(`${environment.apiUrl}/api/v1/auth/refresh`, { refreshToken })
        .pipe(
          tap((tokens) => this.store.set(tokens)),
          catchError((error: unknown) => {
            if (!isServerUnavailable(error)) {
              this.clearSession();
            }
            return throwError(() => error);
          }),
          finalize(() => {
            this.refreshInFlight$ = null;
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.refreshInFlight$;
  }

  /** Cierra la sesión local y, si se puede, la del backend. Nunca falla. */
  logout(): Observable<void> {
    const refreshToken = this.store.getRefreshToken();
    const request$ = refreshToken
      ? this.http.post<void>(`${environment.apiUrl}/api/v1/auth/logout`, { refreshToken })
      : of(undefined);

    return request$.pipe(
      catchError(() => of(undefined)),
      finalize(() => this.clearSession()),
      map(() => undefined),
    );
  }

  private fetchUser(): Observable<SessionUser> {
    return this.http.get<SessionUser>(`${environment.apiUrl}/api/v1/auth/me`).pipe(
      tap((user) => {
        this.user.set(user);
        this.status.set('signedIn');
      }),
    );
  }

  private clearSession(): void {
    this.store.clear();
    this.user.set(null);
    this.status.set('signedOut');
  }
}
