import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { SaludService } from '../salud.service';

/**
 * Tests del servicio de salud.
 *
 * Se intercepta el `HttpClient` en lugar de levantar el backend: los tests tienen que correr en
 * cualquier máquina y en CI, sin depender de que haya un servidor arriba. Lo que se verifica es cómo
 * traduce el servicio cada respuesta posible, que es su única responsabilidad.
 */
describe('SaludService', () => {
  let servicio: SaludService;
  let httpMock: HttpTestingController;
  const url = `${environment.urlApi}/salud`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(SaludService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Falla si quedó alguna petición sin atender: detecta llamadas de más que nadie esperaba.
    httpMock.verify();
  });

  it('consulta la ruta /salud del backend', () => {
    servicio.obtenerSalud().subscribe();

    const pedido = httpMock.expectOne(url);
    expect(pedido.request.method).toBe('GET');
    pedido.flush({ estado: 'ok', momento: '' });
  });

  it('devuelve conectado cuando el backend responde ok', () => {
    let resultado: unknown;
    servicio.obtenerSalud().subscribe((r) => (resultado = r));

    httpMock.expectOne(url).flush({ estado: 'ok', momento: '2026-09-16T12:00:00Z' });

    expect(resultado).toEqual({ estado: 'conectado', momento: '2026-09-16T12:00:00Z' });
  });

  it('devuelve error cuando no hay conexión', () => {
    let resultado: { estado: string; motivo?: string } | undefined;
    servicio.obtenerSalud().subscribe((r) => (resultado = r as typeof resultado));

    // status 0: la petición no llegó a destino.
    httpMock.expectOne(url).error(new ProgressEvent('error'), { status: 0 });

    expect(resultado?.estado).toBe('error');
    expect(resultado?.motivo).toContain('No se pudo conectar');
  });

  it('devuelve error cuando el backend responde con un código de error', () => {
    let resultado: { estado: string; motivo?: string } | undefined;
    servicio.obtenerSalud().subscribe((r) => (resultado = r as typeof resultado));

    httpMock.expectOne(url).flush('sin servicio', { status: 503, statusText: 'Service Unavailable' });

    expect(resultado?.estado).toBe('error');
    expect(resultado?.motivo).toContain('503');
  });

  it('devuelve error cuando el backend responde un estado distinto de ok', () => {
    let resultado: { estado: string; motivo?: string } | undefined;
    servicio.obtenerSalud().subscribe((r) => (resultado = r as typeof resultado));

    httpMock.expectOne(url).flush({ estado: 'degradado', momento: '' });

    expect(resultado?.estado).toBe('error');
    expect(resultado?.motivo).toContain('degradado');
  });
});
