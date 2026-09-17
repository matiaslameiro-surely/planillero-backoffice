import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { authInterceptor } from '../auth.interceptor';
import { TokenStoreService } from '../../services/token-store.service';

/**
 * Tests del interceptor de autenticación.
 *
 * Lo que se verifica es su única responsabilidad: adjuntar el Bearer y, ante un 401, renovar la
 * sesión una vez y reintentar.
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
