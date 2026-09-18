import { Injectable } from '@angular/core';

import type { Tokens } from '../models/auth.model';

/** Clave del refresh token en `localStorage`. */
const REFRESH_KEY = 'planillero.refresh';

/**
 * Guarda los tokens de la sesión.
 *
 * El access token vive en memoria: no hace falta persistirlo porque se renueva solo, y así no queda
 * expuesto en un lugar del que cualquiera pueda leerlo. El refresh token sí va a `localStorage`
 * para que la sesión sobreviva a una recarga de la pestaña; es la limitación conocida frente a una
 * cookie `httpOnly`.
 */
@Injectable({ providedIn: 'root' })
export class TokenStoreService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  set(tokens: Tokens): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.writeRefresh(tokens.refreshToken);
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    // En memoria primero: cubre los entornos donde `localStorage` no existe o está bloqueado.
    return this.refreshToken ?? this.readRefresh();
  }

  clear(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.removeRefresh();
  }

  private writeRefresh(value: string): void {
    try {
      localStorage.setItem(REFRESH_KEY, value);
    } catch {
      // Sin `localStorage` la sesión no sobrevive a una recarga, pero la app sigue funcionando.
    }
  }

  private readRefresh(): string | null {
    try {
      return localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  }

  private removeRefresh(): void {
    try {
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      // Nada que hacer: no había nada guardado.
    }
  }
}
