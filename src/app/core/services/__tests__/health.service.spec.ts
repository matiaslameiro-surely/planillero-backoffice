import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { HealthService } from '../health.service';

/**
 * Tests del servicio de salud.
 *
 * Se intercepta el `HttpClient` en lugar de levantar el backend: los tests tienen que correr en
 * cualquier máquina y en CI, sin depender de que haya un servidor arriba. Lo que se verifica es cómo
 * traduce el servicio cada respuesta posible, que es su única responsabilidad.
 */
describe('HealthService', () => {
  let service: HealthService;
  let httpMock: HttpTestingController;
  const url = `${environment.apiUrl}/salud`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HealthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Falla si quedó alguna petición sin atender: detecta llamadas de más que nadie esperaba.
    httpMock.verify();
  });

  it('consulta la ruta /salud del backend', () => {
    service.getHealth().subscribe();

    const request = httpMock.expectOne(url);
    expect(request.request.method).toBe('GET');
    request.flush({ estado: 'ok', momento: '' });
  });

  it('devuelve connected cuando el backend responde ok', () => {
    let result: unknown;
    service.getHealth().subscribe((r) => (result = r));

    httpMock.expectOne(url).flush({ estado: 'ok', momento: '2026-09-16T12:00:00Z' });

    expect(result).toEqual({ status: 'connected', at: '2026-09-16T12:00:00Z' });
  });

  it('devuelve error cuando no hay conexión', () => {
    let result: { status: string; reason?: string } | undefined;
    service.getHealth().subscribe((r) => (result = r as typeof result));

    // status 0: la petición no llegó a destino.
    httpMock.expectOne(url).error(new ProgressEvent('error'), { status: 0 });

    expect(result?.status).toBe('error');
    expect(result?.reason).toContain('No se pudo conectar');
  });

  it('devuelve error cuando el backend responde con un código de error', () => {
    let result: { status: string; reason?: string } | undefined;
    service.getHealth().subscribe((r) => (result = r as typeof result));

    httpMock.expectOne(url).flush('sin servicio', { status: 503, statusText: 'Service Unavailable' });

    expect(result?.status).toBe('error');
    expect(result?.reason).toContain('503');
  });

  it('devuelve error cuando el backend responde un estado distinto de ok', () => {
    let result: { status: string; reason?: string } | undefined;
    service.getHealth().subscribe((r) => (result = r as typeof result));

    httpMock.expectOne(url).flush({ estado: 'degradado', momento: '' });

    expect(result?.status).toBe('error');
    expect(result?.reason).toContain('degradado');
  });
});
