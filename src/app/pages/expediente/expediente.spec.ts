import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FormsApiService } from '../../forms/forms-api.service';
import type { JsonSchema, VisitWithForm } from '../../forms/types';
import { VisitsApiService } from '../../visits/visits-api.service';
import { ExpedienteComponent } from './expediente.component';

/**
 * Tests del expediente.
 *
 * La app es zoneless: la vista sólo se redibuja cuando cambia un signal. Por eso cada caso espera a
 * que se resuelva la carga (`whenStable`) y recién ahí mira el DOM. Con el estado en propiedades
 * comunes, la vista se quedaba en «Cargando expediente...» aunque los datos ya hubieran llegado.
 */
describe('ExpedienteComponent', () => {
  const visitId = 'a0000001-0000-4000-8000-000000000001';

  const visit: VisitWithForm = {
    id: visitId,
    code: 'V-9001',
    address: 'Calle Ficticia 123',
    latitude: -34.5,
    longitude: -58.4,
    jurisdiction: 'ZONA_PRUEBA',
    status: 'ASSIGNED',
    urgency: 'HIGH',
    createdAt: '2026-09-24T12:00:00Z',
  };

  const schema: JsonSchema = {
    type: 'object',
    properties: { observaciones: { type: 'string', title: 'Observaciones' } },
  } as JsonSchema;

  let visitsApi: VisitsApiService;
  let formsApi: FormsApiService;
  let fixture: ComponentFixture<ExpedienteComponent>;

  function configure(routeVisitId: string | null): void {
    visitsApi = { getVisitWithForm: vi.fn(() => of(visit)) } as unknown as VisitsApiService;
    formsApi = { getTemplate: vi.fn(() => of({ schema })) } as unknown as FormsApiService;

    TestBed.configureTestingModule({
      imports: [ExpedienteComponent],
      providers: [
        provideRouter([]),
        { provide: VisitsApiService, useValue: visitsApi },
        { provide: FormsApiService, useValue: formsApi },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap(routeVisitId ? { visitId: routeVisitId } : {}) },
          },
        },
      ],
    });
  }

  /**
   * Como en el navegador: la vista se redibuja sola sólo si algo la agenda (un signal que cambia).
   * No se llama a `detectChanges()` después de la carga, porque eso redibujaría también con
   * propiedades comunes y escondería justamente el bug.
   */
  async function render(): Promise<HTMLElement> {
    fixture = TestBed.createComponent(ExpedienteComponent);
    fixture.autoDetectChanges();
    // Deja correr la carga asíncrona (las promesas de firstValueFrom) y lo que haya agendado.
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('sale de «Cargando» y muestra la visita cuando la API responde', async () => {
    configure(visitId);
    const el = await render();

    expect(el.textContent).not.toContain('Cargando expediente');
    expect(el.querySelector('h1')?.textContent).toContain('V-9001');
    expect(vi.mocked(visitsApi.getVisitWithForm)).toHaveBeenCalledWith(visitId);
  });

  it('muestra el error y no queda cargando si la API falla', async () => {
    configure(visitId);
    vi.mocked(visitsApi.getVisitWithForm).mockReturnValue(throwError(() => new Error('500')));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const el = await render();

    expect(el.textContent).not.toContain('Cargando expediente');
    expect(el.querySelector('.error')?.textContent).toContain('No se pudo cargar el expediente');
  });

  it('muestra el formulario en solo lectura cuando la visita tiene respuestas', async () => {
    configure(visitId);
    vi.mocked(visitsApi.getVisitWithForm).mockReturnValue(
      of({ ...visit, templateKey: 'relevamiento', templateVersion: 1, responses: { observaciones: 'Sin novedad' } }),
    );
    const el = await render();

    expect(vi.mocked(formsApi.getTemplate)).toHaveBeenCalledWith('relevamiento', 1);
    expect(el.querySelector('.form-section')).not.toBeNull();
    expect(el.querySelector('app-dynamic-form')).not.toBeNull();
    expect(el.textContent).toContain('Modo solo lectura');
  });

  it('avisa si la ruta no trae el ID de la visita', async () => {
    configure(null);
    const el = await render();

    expect(el.querySelector('.error')?.textContent).toContain('ID de visita no proporcionado');
    expect(vi.mocked(visitsApi.getVisitWithForm)).not.toHaveBeenCalled();
  });
});
