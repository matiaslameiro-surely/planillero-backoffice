import { ComponentFixture, TestBed } from '@angular/core/testing';
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
    openPopup: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
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

import type { DashboardSummary, OperatorLiveStatus } from '../../core/models/supervision.model';
import { SupervisionService } from '../../core/services/supervision.service';
import { Supervision } from './supervision';

describe('Supervision Component', () => {
  let fixture: ComponentFixture<Supervision>;
  let component: Supervision;

  const mockSummary: DashboardSummary = {
    date: '2026-10-04',
    jurisdiction: 'ZONA_NORTE',
    totalOperators: 2,
    inFieldOperators: 1,
    delayedOperators: 1,
    offlineOperators: 0,
    completedShiftOperators: 0,
    totalVisits: 6,
    pendingVisits: 4,
    inProgressVisits: 1,
    completedVisits: 1,
    slaComplianceRate: 50.0,
    exceptions: [
      {
        operatorId: 'op-2',
        operatorUsername: 'operador.norte2',
        type: 'OUT_OF_SLA',
        severity: 'HIGH',
        message: 'Operador demorado en visita fuera de SLA',
        detectedAt: '2026-10-04T12:00:00Z',
      },
    ],
  };

  const mockOperators: OperatorLiveStatus[] = [
    {
      operatorId: 'op-1',
      username: 'operador.demo',
      jurisdiction: 'ZONA_NORTE',
      status: 'EN_CAMPO',
      batteryLevel: 0.82,
      networkStatus: 'ONLINE',
      lastHeartbeatAt: '2026-10-04T12:00:00Z',
      lastLatitude: -34.522345,
      lastLongitude: -58.478901,
      assignedVisitsCount: 3,
      completedVisitsCount: 1,
      activeVisitCode: 'V-1002',
      activeVisitAddress: 'Av. Maipu 2450',
      activeVisitElapsedMinutes: 15,
      slaStatus: 'OK',
      observations: 'Operador activo',
    },
    {
      operatorId: 'op-2',
      username: 'operador.norte2',
      jurisdiction: 'ZONA_NORTE',
      status: 'DEMORADO',
      batteryLevel: 0.18,
      networkStatus: 'ONLINE',
      lastHeartbeatAt: '2026-10-04T12:00:00Z',
      lastLatitude: -34.543123,
      lastLongitude: -58.452123,
      assignedVisitsCount: 3,
      completedVisitsCount: 0,
      activeVisitCode: 'V-1001',
      activeVisitAddress: 'Av. Cabildo 1234',
      activeVisitElapsedMinutes: 55,
      slaStatus: 'DELAYED',
      observations: 'Demora por transito',
    },
  ];

  const mockSupervisionService = {
    getTableroResumen: vi.fn(() => of(mockSummary)),
    getOperadoresEstado: vi.fn(() => of(mockOperators)),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Supervision],
      providers: [
        { provide: SupervisionService, useValue: mockSupervisionService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Supervision);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('se inicializa y carga KPIs y operadores del servicio', () => {
    expect(component.summary()).toEqual(mockSummary);
    expect(component.operators().length).toBe(2);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Tablero Central de Supervisión');
    expect(compiled.textContent).toContain('ZONA_NORTE');
    expect(compiled.textContent).toContain('50%');
  });

  it('despliega panel de excepciones destacadas ante operadores fuera de SLA', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Monitoreo de Excepciones');
    expect(compiled.textContent).toContain('operador.norte2');
    expect(compiled.textContent).toContain('Operador demorado en visita fuera de SLA');
  });

  it('permite seleccionar un operador para resaltarlo', () => {
    expect(component.selectedOperatorId()).toBeNull();

    component.selectOperator(mockOperators[0]);
    expect(component.selectedOperatorId()).toBe('op-1');

    // Al seleccionar el mismo operador se deselecciona
    component.selectOperator(mockOperators[0]);
    expect(component.selectedOperatorId()).toBeNull();
  });

  it('permite cambiar la frecuencia de polling', () => {
    component.onPollingChange(60);
    expect(component.pollingSeconds()).toBe(60);

    component.onPollingChange(0);
    expect(component.pollingSeconds()).toBe(0);
  });
});
