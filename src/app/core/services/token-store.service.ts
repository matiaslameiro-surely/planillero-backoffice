import { Injectable } from '@angular/core';

import type { Tokens } from '../models/auth.model';

/** Clave del refresh token en `localStorage`. */
const REFRESH_KEY = 'planillero.refresh';

export interface JwtPayload {
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

/** Decodifica el payload de un JWT sin validar la firma. Devuelve null si no es un JWT válido. */
export function parseJwt(token: string): JwtPayload | null {
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
  private expiresAt: number | null = null;

  set(tokens: Tokens, receivedAt: number = Date.now()): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.writeRefresh(tokens.refreshToken);
    this.expiresAt = this.calculateExpiresAt(tokens.accessToken, receivedAt);
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    // En memoria primero: cubre los entornos donde `localStorage` no existe o está bloqueado.
    return this.refreshToken ?? this.readRefresh();
  }

  getExpiresAt(): number | null {
    return this.expiresAt;
  }

  /**
   * Determina si el token está por expirar dentro del margen establecido (o ya expiró).
   * Si no hay token de acceso, devuelve true (requiere emisión/renovación).
   * Si el token no tiene payload JWT interpretable, devuelve false para no bloquear llamadas.
   */
  isAccessTokenExpiring(marginSeconds = 30): boolean {
    if (!this.accessToken) {
      return true;
    }
    if (this.expiresAt === null) {
      return false;
    }
    return this.expiresAt - Date.now() <= marginSeconds * 1000;
  }

  clear(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
    this.removeRefresh();
  }

  private calculateExpiresAt(token: string | null, receivedAt: number): number | null {
    if (!token) {
      return null;
    }
    const payload = parseJwt(token);
    if (!payload || typeof payload.exp !== 'number') {
      return null;
    }
    if (typeof payload.iat === 'number') {
      // Vencimiento relativo medido con el reloj local: recibidoLocal + (exp - iat).
      // Evita descalces si la hora de la PC difiere de la del servidor.
      const ttlMs = (payload.exp - payload.iat) * 1000;
      return receivedAt + ttlMs;
    }
    return payload.exp * 1000;
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
