import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { AuditService } from '../audit.service';

/**
 * Tests del servicio de auditoría.
 *
 * Se intercepta el `HttpClient`: lo que se verifica es cómo arma cada request del contrato
 * (ruta, parámetros) y cómo devuelve la respuesta.
 */
describe('AuditService', () => {
  let service: AuditService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('trae la página de eventos con la paginación por defecto', () => {
    let page: unknown;
    service.getLogs().subscribe((p) => (page = p));

    const request = httpMock.expectOne((req) => req.url === `${apiUrl}/api/v1/audit/logs`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('20');
    const body = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 };
    request.flush(body);

    expect(page).toEqual(body);
  });

  it('arma los filtros combinados', () => {
    service.getLogs({ eventType: 'VISIT_STARTED', username: 'operador.demo' }).subscribe();

    const request = httpMock.expectOne((req) => req.url === `${apiUrl}/api/v1/audit/logs`);
    expect(request.request.params.get('eventType')).toBe('VISIT_STARTED');
    expect(request.request.params.get('username')).toBe('operador.demo');
    request.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
  });

  it('verifica la cadena completa sin visitId', () => {
    let result: unknown;
    service.verify().subscribe((r) => (result = r));

    const request = httpMock.expectOne((req) => req.url === `${apiUrl}/api/v1/audit/verify`);
    expect(request.request.params.has('visitId')).toBe(false);
    const body = { intacta: true, primerEslabonRotoId: null, motivo: null };
    request.flush(body);

    expect(result).toEqual(body);
  });

  it('verifica una visita puntual', () => {
    service.verify('a0000001-0000-4000-8000-000000000001').subscribe();

    const request = httpMock.expectOne((req) => req.url === `${apiUrl}/api/v1/audit/verify`);
    expect(request.request.params.get('visitId')).toBe('a0000001-0000-4000-8000-000000000001');
    request.flush({ intacta: true, primerEslabonRotoId: null, motivo: null });
  });
});
