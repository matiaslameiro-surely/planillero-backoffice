import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('leaflet', () => {
  const tileLayer = vi.fn(() => ({ addTo: vi.fn().mockReturnThis() }));
  const layerGroup = vi.fn(() => ({ addTo: vi.fn().mockReturnThis(), clearLayers: vi.fn() }));
  const latLng = vi.fn((lat: number, lng: number) => ({ lat, lng }));
  const latLngBounds = vi.fn(() => ({}));
  const marker = vi.fn(() => ({
    bindPopup: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
  }));
  const map = vi.fn(() => ({
    setView: vi.fn().mockReturnThis(),
    invalidateSize: vi.fn(),
    fitBounds: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  }));
  return {
    Icon: { Default: { mergeOptions: vi.fn() } },
    map,
    tileLayer,
    layerGroup,
    marker,
    latLng,
    latLngBounds,
  };
});

import type { Operator, RouteSheet, Visit } from '../../core/models/planificacion.model';
import { PlanificacionService } from '../../core/services/planificacion.service';
import { Planificacion } from './planificacion';

/**
 * Tests de la pantalla de planificación.
 *
 * El servicio se reemplaza por un stub con respuestas síncronas para evitar la capa HTTP, y Leaflet
 * se mockea a nivel de módulo (el mapa hijo usa el canvas real). Se verifican el flujo de carga, los
 * filtros, la selección y las dos formas de asignar (rápida y en bloque).
 */
describe('Planificacion', () => {
  const operator: Operator = {
    id: 'op-1',
    username: 'ana',
    jurisdiction: 'ZONA_NORTE',
  };

  const pendiente: Visit = {
    id: 'a0000001-0000-4000-8000-000000000001',
    code: 'V-1001',
    address: 'Av. Cabildo 1234, CABA',
    latitude: -34.543123,
    longitude: -58.452123,
    status: 'PENDING',
    urgency: 'HIGH',
  };

  const completada: Visit = {
    ...pendiente,
    id: 'a0000001-0000-4000-8000-000000000002',
    code: 'V-1002',
    status: 'COMPLETED',
    urgency: 'LOW',
  };

  const hoja: RouteSheet = {
    operatorId: operator.id,
    operatorUsername: operator.username,
    date: '2026-09-18',
    items: [{ position: 1, visit: pendiente }],
  };

  let fixture: ComponentFixture<Planificacion>;
  let service: PlanificacionService;

  beforeEach(() => {
    service = {
      getOperators: vi.fn(() => of([operator])),
      getVisits: vi.fn(() => of([pendiente])),
      getRouteSheet: vi.fn(() => of(hoja)),
      assign: vi.fn(() => of(hoja)),
    } as unknown as PlanificacionService;

    TestBed.configureTestingModule({
      imports: [Planificacion],
      providers: [
        { provide: PlanificacionService, useValue: service },
        provideRouter([]),
      ],
    });
  });

  /** Crea la pantalla; opcionalmente se puede configurar el stub antes de llamarla. */
  function create(): void {
    fixture = TestBed.createComponent(Planificacion);
    fixture.detectChanges();
  }

  function firstCheckbox(): HTMLInputElement | null {
    return fixture.nativeElement.querySelector('.planificacion__table input[type="checkbox"]');
  }

  function dateInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input[type="date"]');
  }

  function findSelect(ariaLabel: string): HTMLSelectElement {
    return fixture.nativeElement.querySelector(`select[aria-label="${ariaLabel}"]`);
  }

  it('carga operadores y visitas, y deja el primero seleccionado', () => {
    create();

    expect(vi.mocked(service.getOperators)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(service.getVisits)).toHaveBeenCalledTimes(1);
    // La fecha por defecto es la de hoy (`todayIso()` del componente), no la de la fixture: se lee
    // del input real en vez de hardcodear un valor que queda viejo apenas cambia el día.
    expect(vi.mocked(service.getRouteSheet)).toHaveBeenCalledWith(operator.id, dateInput().value);

    const rows = fixture.nativeElement.querySelectorAll('.planificacion__table tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('V-1001');
    expect(
      fixture.nativeElement.querySelector('.planificacion__side .planificacion__section')
        .textContent,
    ).toContain('ana');
  });

  it('marca visitas y asigna en bloque con el operador y la fecha de la cabecera', () => {
    create();
    firstCheckbox()!.click();
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.planificacion__primary',
    );
    button.click();
    fixture.detectChanges();

    expect(vi.mocked(service.assign)).toHaveBeenCalledWith({
      operatorId: operator.id,
      date: dateInput().value,
      visitIds: [pendiente.id],
    });
    expect(fixture.nativeElement.querySelector('.planificacion__feedback--ok').textContent).toContain(
      'Asignadas 1 visita(s)',
    );
    expect(fixture.nativeElement.querySelector('.planificacion__primary').textContent).toContain(
      '(0)',
    );
  });

  it('filtra por estado y urgencia al cambiar los selects', () => {
    create();

    const status = findSelect('Estado');
    status.value = 'ASSIGNED';
    status.dispatchEvent(new Event('change'));

    const urgency = findSelect('Urgencia');
    urgency.value = 'HIGH';
    urgency.dispatchEvent(new Event('change'));

    expect(vi.mocked(service.getVisits)).toHaveBeenLastCalledWith({
      status: 'ASSIGNED',
      urgency: 'HIGH',
      operatorId: operator.id,
      date: dateInput().value,
    });
  });

  it('asigna una sola visita desde la accion rapida de la fila', () => {
    create();

    fixture.nativeElement.querySelectorAll('.planificacion__link')[0].click();
    fixture.detectChanges();

    expect(vi.mocked(service.assign)).toHaveBeenCalledWith({
      operatorId: operator.id,
      date: dateInput().value,
      visitIds: [pendiente.id],
    });
  });

  it('no ofrece asignar visitas ya cerradas', () => {
    vi.mocked(service.getVisits).mockReturnValue(of([pendiente, completada]));
    create();

    const rows = fixture.nativeElement.querySelectorAll('.planificacion__table tbody tr');
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('input[type="checkbox"]').length).toBe(1);
    expect(rows[1].textContent).toContain('No asignable');
  });

  it('muestra la hoja de ruta del operador con su orden', () => {
    create();

    const items = fixture.nativeElement.querySelectorAll('.planificacion__route-item');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('V-1001');
    expect(items[0].textContent).toContain('1');
  });
});