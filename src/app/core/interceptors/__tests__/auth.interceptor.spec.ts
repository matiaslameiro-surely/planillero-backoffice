import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { authInterceptor } from '../auth.interceptor';
import { TokenStoreService } from '../../services/token-store.service';

/** Genera un JWT sintético para pruebas con el claim `exp` desfasado respecto al momento actual. */
function createTestJwt(expInSecondsFromNow: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + expInSecondsFromNow;
  const payload = btoa(JSON.stringify({ sub: 'user.test', exp }));
  return `${header}.${payload}.mockSignature`;
}

/**
 * Tests del interceptor de autenticación.
 *
 * Cubre:
 * 1. Exclusión de endpoints públicos (/salud, /health, /auth/*) de la cabecera Authorization.
 * 2. Renovación proactiva del token antes de que expire (evitando 401 en consola).
 * 3. Compartición de un solo refresh entre peticiones simultáneas.
 * 4. Envío directo cuando el token es válido.
 * 5. Respaldo reactivo ante 401.
 */
describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let store: TokenStoreService;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(TokenStoreService);
    store.clear();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adjunta el Bearer del access token', () => {
    store.set({ accessToken: 'a1', refreshToken: 'r1' });
    http.get(`${apiUrl}/api/v1/auth/me`).subscribe();

    const request = httpMock.expectOne(`${apiUrl}/api/v1/auth/me`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer a1');
    request.flush({});
  });

  it('no adjunta Bearer en el login', () => {
    store.set({ accessToken: 'a1', refreshToken: 'r1' });
    http.post(`${apiUrl}/api/v1/auth/login`, {}).subscribe();

    const request = httpMock.expectOne(`${apiUrl}/api/v1/auth/login`);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('no adjunta Bearer en endpoints públicos (/salud, /health) aun con token vencido en el store', () => {
    const expiredToken = createTestJwt(-120);
    store.set({ accessToken: expiredToken, refreshToken: 'r1' });

    http.get(`${apiUrl}/salud`).subscribe();
    const saludReq = httpMock.expectOne(`${apiUrl}/salud`);
    expect(saludReq.request.headers.has('Authorization')).toBe(false);
    saludReq.flush({ estado: 'ok' });

    http.get(`${apiUrl}/health?check=1`).subscribe();
    const healthReq = httpMock.expectOne(`${apiUrl}/health?check=1`);
    expect(healthReq.request.headers.has('Authorization')).toBe(false);
    healthReq.flush({ estado: 'ok' });
  });

  it('renueva el token proactivamente si está por expirar en menos de 30s', () => {
    const expiringToken = createTestJwt(10);
    const refreshedToken = createTestJwt(900);
    store.set({ accessToken: expiringToken, refreshToken: 'r1' });

    let response: unknown;
    http.get(`${apiUrl}/api/v1/auth/me`).subscribe((r) => (response = r));

    // Debe dispararse primero el refresh antes de consultar /api/v1/auth/me
    const refreshReq = httpMock.expectOne(`${apiUrl}/api/v1/auth/refresh`);
    expect(refreshReq.request.body).toEqual({ refreshToken: 'r1' });
    refreshReq.flush({ accessToken: refreshedToken, refreshToken: 'r2' });

    // Inmediatamente después sale la petición original con el nuevo token
    const meReq = httpMock.expectOne(`${apiUrl}/api/v1/auth/me`);
    expect(meReq.request.headers.get('Authorization')).toBe(`Bearer ${refreshedToken}`);
    meReq.flush({ username: 'operador' });

    expect(response).toEqual({ username: 'operador' });
    expect(store.getAccessToken()).toBe(refreshedToken);
  });

  it('renueva el token proactivamente si ya expiró (evitando error 401 en la consola)', () => {
    const expiredToken = createTestJwt(-60);
    const refreshedToken = createTestJwt(900);
    store.set({ accessToken: expiredToken, refreshToken: 'r1' });

    http.get(`${apiUrl}/api/v1/planificacion`).subscribe();

    const refreshReq = httpMock.expectOne(`${apiUrl}/api/v1/auth/refresh`);
    refreshReq.flush({ accessToken: refreshedToken, refreshToken: 'r2' });

    const planReq = httpMock.expectOne(`${apiUrl}/api/v1/planificacion`);
    expect(planReq.request.headers.get('Authorization')).toBe(`Bearer ${refreshedToken}`);
    planReq.flush([]);
  });

  it('comparte un único refresh en vuelo ante múltiples peticiones simultáneas con token por vencer', () => {
    const expiringToken = createTestJwt(5);
    const refreshedToken = createTestJwt(900);
    store.set({ accessToken: expiringToken, refreshToken: 'r1' });

    let res1: unknown;
    let res2: unknown;
    http.get(`${apiUrl}/api/v1/recurso-a`).subscribe((r) => (res1 = r));
    http.get(`${apiUrl}/api/v1/recurso-b`).subscribe((r) => (res2 = r));

    // Se realiza exactamente una única llamada a /api/v1/auth/refresh
    const refreshReq = httpMock.expectOne(`${apiUrl}/api/v1/auth/refresh`);
    refreshReq.flush({ accessToken: refreshedToken, refreshToken: 'r2' });

    const reqA = httpMock.expectOne(`${apiUrl}/api/v1/recurso-a`);
    const reqB = httpMock.expectOne(`${apiUrl}/api/v1/recurso-b`);
    expect(reqA.request.headers.get('Authorization')).toBe(`Bearer ${refreshedToken}`);
    expect(reqB.request.headers.get('Authorization')).toBe(`Bearer ${refreshedToken}`);

    reqA.flush({ a: 1 });
    reqB.flush({ b: 2 });

    expect(res1).toEqual({ a: 1 });
    expect(res2).toEqual({ b: 2 });
  });

  it('no renueva proactivamente si el token tiene vigencia suficiente (> 30s)', () => {
    const validToken = createTestJwt(300);
    store.set({ accessToken: validToken, refreshToken: 'r1' });

    http.get(`${apiUrl}/api/v1/auth/me`).subscribe();

    // No debe haber petición a /auth/refresh
    httpMock.expectNone(`${apiUrl}/api/v1/auth/refresh`);

    const req = httpMock.expectOne(`${apiUrl}/api/v1/auth/me`);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${validToken}`);
    req.flush({ username: 'demo' });
  });

  it('ante un 401 renueva la sesión y reintenta la petición', () => {
    store.set({ accessToken: 'viejo', refreshToken: 'r1' });
    let result: unknown;
    http.get(`${apiUrl}/api/v1/auth/me`).subscribe((r) => (result = r));

    httpMock
      .expectOne(`${apiUrl}/api/v1/auth/me`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    httpMock
      .expectOne(`${apiUrl}/api/v1/auth/refresh`)
      .flush({ accessToken: 'nuevo', refreshToken: 'r2' });

    const retry = httpMock.expectOne(`${apiUrl}/api/v1/auth/me`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer nuevo');
    retry.flush({ username: 'admin.demo' });

    expect(result).toEqual({ username: 'admin.demo' });
  });

  it('si el refresh falla, propaga el error y cierra la sesión', () => {
    store.set({ accessToken: 'viejo', refreshToken: 'r1' });
    let error: unknown;
    http.get(`${apiUrl}/api/v1/auth/me`).subscribe({ error: (e) => (error = e) });

    httpMock
      .expectOne(`${apiUrl}/api/v1/auth/me`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    httpMock
      .expectOne(`${apiUrl}/api/v1/auth/refresh`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(error).toBeTruthy();
    expect(store.getRefreshToken()).toBeNull();
  });
});
