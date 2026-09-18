import { ComponentFixture, TestBed } from '@angular/core/testing';
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

import * as Leaflet from 'leaflet';

import type { Visit } from '../../../core/models/planificacion.model';
import { RouteMap } from './route-map';

/**
 * Tests del mapa de rutas.
 *
 * Leaflet se mockea por completo: no toca la red ni el DOM real del mapa. Lo que se verifica es que
 * el componente inicializa el mapa una vez y pinta un marcador por visita con sus coordenadas.
 */
describe('RouteMap', () => {
  const LeafletMock = vi.mocked(Leaflet);

  const visita: Visit = {
    id: 'a0000001-0000-4000-8000-000000000001',
    code: 'V-1001',
    address: 'Av. Cabildo 1234, CABA',
    latitude: -34.543123,
    longitude: -58.452123,
    status: 'PENDING',
    urgency: 'HIGH',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function setup(visits: Visit[]): Promise<ComponentFixture<RouteMap>> {
    await TestBed.configureTestingModule({ imports: [RouteMap] }).compileComponents();
    const fixture = TestBed.createComponent(RouteMap);
    fixture.componentRef.setInput('visits', visits);
    fixture.detectChanges();
    return fixture;
  }

  it('levanta el mapa de Leaflet sobre el canvas', async () => {
    await setup([]);

    expect(LeafletMock.map).toHaveBeenCalledTimes(1);
    expect(LeafletMock.tileLayer).toHaveBeenCalledWith('https://tile.openstreetmap.org/{z}/{x}/{y}.png', expect.anything());
    expect(LeafletMock.Icon.Default.mergeOptions).toHaveBeenCalledOnce();
  });

  it('no levanta el mapa dos veces aunque cambien las visitas', async () => {
    const fixture = await setup([]);
    fixture.componentRef.setInput('visits', [visita]);
    fixture.detectChanges();

    expect(LeafletMock.map).toHaveBeenCalledTimes(1);
  });

  it('pinta un marcador por visita con sus coordenadas', async () => {
    const otra: Visit = {
      ...visita,
      id: 'a0000001-0000-4000-8000-000000000002',
      code: 'V-1002',
      latitude: -34.5,
      longitude: -58.45,
    };
    await setup([visita, otra]);

    expect(LeafletMock.marker).toHaveBeenCalledTimes(2);
    expect(LeafletMock.latLng).toHaveBeenCalledWith(visita.latitude, visita.longitude);
    expect(LeafletMock.latLng).toHaveBeenCalledWith(otra.latitude, otra.longitude);
    expect(LeafletMock.latLngBounds).toHaveBeenCalledWith([
      { lat: visita.latitude, lng: visita.longitude },
      { lat: otra.latitude, lng: otra.longitude },
    ]);
  });

  it('muestra el mensaje de vacío sin visitas y lo oculta cuando llegan', async () => {
    const fixture = await setup([]);
    let empty = fixture.nativeElement.querySelector('.route-map__empty');
    expect(empty).toBeTruthy();

    fixture.componentRef.setInput('visits', [visita]);
    fixture.detectChanges();

    empty = fixture.nativeElement.querySelector('.route-map__empty');
    expect(empty).toBeNull();
  });
});