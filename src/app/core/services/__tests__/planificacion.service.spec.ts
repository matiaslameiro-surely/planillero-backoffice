import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import type { Visit } from '../../models/planificacion.model';
import { PlanificacionService } from '../planificacion.service';

/**
 * Tests del servicio de planificación.
 *
 * Se intercepta el `HttpClient` en lugar de levantar el backend. Lo que se verifica es cómo arma cada
 * request del contrato (método, ruta y parámetros) y cómo devuelve la respuesta.
 */
describe('PlanificacionService', () => {
  let service: PlanificacionService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  const visita: Visit = {
    id: 'a0000001-0000-4000-8000-000000000001',
    code: 'V-1001',
    address: 'Av. Cabildo 1234, CABA',
    latitude: -34.543123,
    longitude: -58.452123,
    status: 'PENDING',
    urgency: 'HIGH',
    syncedDeferred: false,
    syncedAt: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlanificacionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('trae los operadores de la jurisdicción', () => {
    let operators: unknown;
    service.getOperators().subscribe((o) => (operators = o));

    const request = httpMock.expectOne(`${apiUrl}/api/v1/operators`);
    expect(request.request.method).toBe('GET');
    request.flush([{ id: '11111111-1111-4111-8111-111111111111', username: 'operador.demo', jurisdiction: 'ZONA_NORTE' }]);

    expect(operators).toEqual([
      { id: '11111111-1111-4111-8111-111111111111', username: 'operador.demo', jurisdiction: 'ZONA_NORTE' },
    ]);
  });

  it('trae la hoja de ruta de un operador para una fecha', () => {
    let sheet: unknown;
    service.getRouteSheet('11111111-1111-4111-8111-111111111111', '2026-10-15').subscribe((s) => (sheet = s));

    const request = httpMock.expectOne(`${apiUrl}/api/v1/operators/11111111-1111-4111-8111-111111111111/route-sheets?date=2026-10-15`);
    expect(request.request.method).toBe('GET');
    request.flush({ operatorId: '11111111-1111-4111-8111-111111111111', operatorUsername: 'operador.demo', date: '2026-10-15', items: [] });

    expect(sheet).toEqual({ operatorId: '11111111-1111-4111-8111-111111111111', operatorUsername: 'operador.demo', date: '2026-10-15', items: [] });
  });

  it('trae las visitas sin filtros', () => {
    let visits: unknown;
    service.getVisits().subscribe((v) => (visits = v));

    const request = httpMock.expectOne(`${apiUrl}/api/v1/visits`);
    expect(request.request.method).toBe('GET');
    request.flush([visita]);

    expect(visits).toEqual([visita]);
  });

  it('arma los filtros combinados de visitas', () => {
    service.getVisits({ status: 'PENDING', urgency: 'HIGH', date: '2026-10-15', operatorId: '11111111-1111-4111-8111-111111111111' }).subscribe();

    const request = httpMock.expectOne((req) => req.url === `${apiUrl}/api/v1/visits`);
    expect(request.request.params.get('status')).toBe('PENDING');
    expect(request.request.params.get('urgency')).toBe('HIGH');
    expect(request.request.params.get('date')).toBe('2026-10-15');
    expect(request.request.params.get('operatorId')).toBe('11111111-1111-4111-8111-111111111111');
    request.flush([]);
  });

  it('omite los filtros vacíos', () => {
    service.getVisits({ status: undefined, urgency: undefined, date: '', operatorId: '' }).subscribe();

    const request = httpMock.expectOne(`${apiUrl}/api/v1/visits`);
    expect(request.request.params.keys()).toHaveLength(0);
    request.flush([]);
  });

  it('asigna visitas con el cuerpo del contrato', () => {
    let sheet: unknown;
    service
      .assign({
        operatorId: '11111111-1111-4111-8111-111111111111',
        date: '2026-10-15',
        visitIds: ['a0000001-0000-4000-8000-000000000001'],
      })
      .subscribe((s) => (sheet = s));

    const request = httpMock.expectOne(`${apiUrl}/api/v1/visits/assign`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      operatorId: '11111111-1111-4111-8111-111111111111',
      date: '2026-10-15',
      visitIds: ['a0000001-0000-4000-8000-000000000001'],
    });
    request.flush({ operatorId: '11111111-1111-4111-8111-111111111111', operatorUsername: 'operador.demo', date: '2026-10-15', items: [{ position: 1, visit: visita }] });

    expect(sheet).toEqual({ operatorId: '11111111-1111-4111-8111-111111111111', operatorUsername: 'operador.demo', date: '2026-10-15', items: [{ position: 1, visit: visita }] });
  });
});