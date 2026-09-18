import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import type { LoginResult, SessionUser, Tokens } from '../../models/auth.model';
import { AuthService } from '../auth.service';
import { TokenStoreService } from '../token-store.service';

/**
 * Tests del servicio de autenticación.
 *
 * Se intercepta el `HttpClient` en lugar de levantar el backend. Lo que se verifica es la lógica de
 * sesión: qué guarda, cuándo limpia y cómo traduce cada respuesta del contrato.
 */
describe('AuthService', () => {
  let service: AuthService;
  let store: TokenStoreService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;
  const me: SessionUser = { username: 'operador.demo', roles: ['OPERATOR'], twoFactorEnabled: false };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    store = TestBed.inject(TokenStoreService);
    httpMock = TestBed.inject(HttpTestingController);
    store.clear();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('devuelve tokens cuando el login no pide 2FA', () => {
    let result: LoginResult | undefined;
    service.login('operador.demo', 'Operador123!').subscribe((r) => (result = r));

    const request = httpMock.expectOne(`${apiUrl}/api/v1/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ username: 'operador.demo', password: 'Operador123!' });
    request.flush({ twoFactorRequired: false, accessToken: 'a1', refreshToken: 'r1' });

    expect(result).toEqual({
      twoFactorRequired: false,
      tokens: { accessToken: 'a1', refreshToken: 'r1' },
    });
  });

  it('devuelve el desafío cuando el login pide 2FA', () => {
    let result: LoginResult | undefined;
    service.login('admin.demo', 'Admin123!').subscribe((r) => (result = r));

    httpMock.expectOne(`${apiUrl}/api/v1/auth/login`).flush({ twoFactorRequired: true, challengeId: 'c1' });

    expect(result).toEqual({ twoFactorRequired: true, challengeId: 'c1' });
  });

  it('guarda los tokens y carga el usuario al iniciar la sesión', () => {
    let user: SessionUser | undefined;
    service
      .startSession({ accessToken: 'a1', refreshToken: 'r1' })
      .subscribe((u) => (user = u));

    httpMock.expectOne(`${apiUrl}/api/v1/auth/me`).flush(me);

    expect(user).toEqual(me);
    expect(store.getAccessToken()).toBe('a1');
    expect(store.getRefreshToken()).toBe('r1');
    expect(service.status()).toBe('signedIn');
  });

  it('completa el 2FA con los tokens y el usuario', () => {
    service.verifyTwoFactor('c1', '123456').subscribe();

    const request = httpMock.expectOne(`${apiUrl}/api/v1/auth/verify-2fa`);
    expect(request.request.body).toEqual({ challengeId: 'c1', code: '123456' });
    request.flush({ accessToken: 'a2', refreshToken: 'r2' });
    httpMock.expectOne(`${apiUrl}/api/v1/auth/me`).flush(me);

    expect(store.getAccessToken()).toBe('a2');
    expect(service.status()).toBe('signedIn');
  });

  it('sin refresh token no hay sesión que restaurar', () => {
    let user: SessionUser | null | undefined;
    service.ensureSession().subscribe((u) => (user = u));

    expect(user).toBeNull();
    expect(service.status()).toBe('signedOut');
  });

  it('restaura la sesión con el refresh token guardado', () => {
    store.set({ accessToken: 'a1', refreshToken: 'r1' });
    let user: SessionUser | null | undefined;
    service.ensureSession().subscribe((u) => (user = u));

    httpMock.expectOne(`${apiUrl}/api/v1/auth/me`).flush(me);

    expect(user).toEqual(me);
    expect(service.status()).toBe('signedIn');
  });

  it('si la restauración falla, limpia la sesión', () => {
    store.set({ accessToken: 'vencido', refreshToken: 'r1' });
    let user: SessionUser | null | undefined;
    service.ensureSession().subscribe((u) => (user = u));

    httpMock.expectOne(`${apiUrl}/api/v1/auth/me`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(user).toBeNull();
    expect(store.getRefreshToken()).toBeNull();
    expect(service.status()).toBe('signedOut');
  });

  it('renueva la sesión y guarda los tokens nuevos', () => {
    store.set({ accessToken: 'viejo', refreshToken: 'r1' });
    let tokens: Tokens | undefined;
    service.refresh().subscribe((t) => (tokens = t));

    const request = httpMock.expectOne(`${apiUrl}/api/v1/auth/refresh`);
    expect(request.request.body).toEqual({ refreshToken: 'r1' });
    request.flush({ accessToken: 'nuevo', refreshToken: 'r2' });

    expect(tokens).toEqual({ accessToken: 'nuevo', refreshToken: 'r2' });
    expect(store.getAccessToken()).toBe('nuevo');
    expect(store.getRefreshToken()).toBe('r2');
  });

  it('cierra la sesión aunque el backend falle al hacer logout', () => {
    store.set({ accessToken: 'a1', refreshToken: 'r1' });
    let done = false;
    service.logout().subscribe(() => (done = true));

    httpMock.expectOne(`${apiUrl}/api/v1/auth/logout`).flush({}, { status: 500, statusText: 'Error' });

    expect(done).toBe(true);
    expect(store.getRefreshToken()).toBeNull();
    expect(service.status()).toBe('signedOut');
  });
});
