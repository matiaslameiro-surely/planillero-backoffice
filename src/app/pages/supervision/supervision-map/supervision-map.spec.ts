import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const bindPopupSpy = vi.fn().mockReturnThis();

vi.mock('leaflet', () => {
  const tileLayer = vi.fn(() => ({ addTo: vi.fn().mockReturnThis() }));
  const layerGroup = vi.fn(() => ({
    addTo: vi.fn().mockReturnThis(),
    clearLayers: vi.fn(),
  }));
  const latLng = vi.fn((lat: number, lng: number) => ({ lat, lng }));
  const latLngBounds = vi.fn(() => ({}));
  const marker = vi.fn(() => ({
    bindPopup: bindPopupSpy,
    addTo: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    openPopup: vi.fn(),
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

import * as Leaflet from 'leaflet';
import type { OperatorLiveStatus } from '../../../core/models/supervision.model';
import { SupervisionMap } from './supervision-map';

describe('SupervisionMap', () => {
  const LeafletMock = vi.mocked(Leaflet);

  const operadorDemo: OperatorLiveStatus = {
    operatorId: '11111111-1111-4111-8111-111111111111',
    username: 'operador.demo',
    jurisdiction: 'ZONA_NORTE',
    status: 'EN_CAMPO',
    batteryLevel: 0.85,
    networkStatus: 'ONLINE',
    lastHeartbeatAt: '2026-09-27T12:00:00Z',
    lastLatitude: -34.53,
    lastLongitude: -58.47,
    assignedVisitsCount: 5,
    completedVisitsCount: 2,
    activeVisitCode: 'V-1001',
    activeVisitAddress: 'Av. Cabildo 1234',
    activeVisitElapsedMinutes: 20,
    slaStatus: 'OK',
    observations: 'Operador en ruta normal',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    bindPopupSpy.mockClear();
  });

  async function setup(operators: OperatorLiveStatus[]): Promise<ComponentFixture<SupervisionMap>> {
    await TestBed.configureTestingModule({ imports: [SupervisionMap] }).compileComponents();
    const fixture = TestBed.createComponent(SupervisionMap);
    fixture.componentRef.setInput('operators', operators);
    fixture.detectChanges();
    return fixture;
  }

  it('inicializa Leaflet y añade capas correctamente', async () => {
    await setup([]);

    expect(LeafletMock.map).toHaveBeenCalledTimes(1);
    expect(LeafletMock.tileLayer).toHaveBeenCalledWith(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      expect.anything()
    );
  });

  it('pinta marcadores para operadores con coordenadas válidas', async () => {
    await setup([operadorDemo]);

    expect(LeafletMock.marker).toHaveBeenCalledTimes(1);
    expect(LeafletMock.latLng).toHaveBeenCalledWith(
      operadorDemo.lastLatitude,
      operadorDemo.lastLongitude
    );
  });

  it('escapa contenido HTML en observaciones y otros campos en el popup para prevenir inyecciones', async () => {
    const operadorConHtml: OperatorLiveStatus = {
      ...operadorDemo,
      username: 'op<script>alert(1)</script>',
      activeVisitCode: 'V-<1001>',
      networkStatus: 'ONLINE & ACTIVE',
      observations: '<b id="inyectado">Alerta</b> y <a href="https://phishing.example">Link</a>',
    };

    await setup([operadorConHtml]);

    expect(bindPopupSpy).toHaveBeenCalledTimes(1);
    const popupHtml = bindPopupSpy.mock.calls[0][0] as string;

    // Verificar que las etiquetas HTML NO están presentes sin escapar
    expect(popupHtml).not.toContain('<b id="inyectado">');
    expect(popupHtml).not.toContain('<a href="https://phishing.example">');
    expect(popupHtml).not.toContain('<script>');
    expect(popupHtml).not.toContain('V-<1001>');

    // Verificar que están debidamente escapadas
    expect(popupHtml).toContain('&lt;b id=&quot;inyectado&quot;&gt;Alerta&lt;/b&gt;');
    expect(popupHtml).toContain('&lt;a href=&quot;https://phishing.example&quot;&gt;Link&lt;/a&gt;');
    expect(popupHtml).toContain('op&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(popupHtml).toContain('V-&lt;1001&gt;');
    expect(popupHtml).toContain('ONLINE &amp; ACTIVE');
  });
});
