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
    syncedDeferred: false,
    syncedAt: null,
  };

  /** Acta cargada sin conexión y sincronizada después. */
  const diferida: Visit = {
    ...pendiente,
    id: 'a0000001-0000-4000-8000-000000000003',
    code: 'V-1003',
    syncedDeferred: true,
    syncedAt: '2026-09-21T11:58:03.412Z',
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
    date: new Date().toISOString().slice(0, 10),
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

  /** Elige el operador a mano: la pantalla ya no preselecciona a nadie. */
  function elegirOperador(id: string = operator.id): void {
    const select = findSelect('Operador');
    select.value = id;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function bulkButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.planificacion__controls .planificacion__primary');
  }

  function confirmPanel(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.planificacion__confirm');
  }

  /** Acepta la confirmación abierta. */
  function confirmar(): void {
    fixture.nativeElement.querySelector('.planificacion__confirm .planificacion__primary').click();
    fixture.detectChanges();
  }

  function cancelar(): void {
    fixture.nativeElement.querySelector('.planificacion__confirm .planificacion__link').click();
    fixture.detectChanges();
  }

  /** Cambia la fecha de la cabecera, salteando el `min` del input (que sólo ata al calendario). */
  function ponerFecha(valor: string): void {
    const input = dateInput();
    input.value = valor;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('carga operadores y visitas sin preseleccionar a nadie', () => {
    create();

    expect(vi.mocked(service.getOperators)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(service.getVisits)).toHaveBeenCalledTimes(1);
    // Nadie elegido: no se pide la hoja de ruta de un operador que el supervisor nunca nombró.
    expect(vi.mocked(service.getRouteSheet)).not.toHaveBeenCalled();
    expect(findSelect('Operador').value).toBe('');

    const rows = fixture.nativeElement.querySelectorAll('.planificacion__table tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('V-1001');
  });

  it('sin operador elegido no se puede asignar por ninguna via', () => {
    create();
    firstCheckbox()!.click();
    fixture.detectChanges();

    expect(bulkButton().disabled).toBe(true);
    expect(
      (fixture.nativeElement.querySelector('.planificacion__link') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('elegir un operador trae su hoja de ruta', () => {
    create();
    elegirOperador();

    // La fecha por defecto es la de hoy (`todayIso()` del componente), no la de la fixture: se lee
    // del input real en vez de hardcodear un valor que queda viejo apenas cambia el día.
    expect(vi.mocked(service.getRouteSheet)).toHaveBeenCalledWith(operator.id, dateInput().value);
    expect(
      fixture.nativeElement.querySelector('.planificacion__side .planificacion__section')
        .textContent,
    ).toContain('ana');
  });

  it('asignar en bloque pide confirmacion antes de tocar el backend', () => {
    create();
    elegirOperador();
    firstCheckbox()!.click();
    fixture.detectChanges();

    bulkButton().click();
    fixture.detectChanges();

    // Lo que importa del hallazgo: el clic abre la confirmación y no asigna.
    expect(vi.mocked(service.assign)).not.toHaveBeenCalled();
    const panel = confirmPanel();
    expect(panel).not.toBeNull();
    expect(panel!.textContent).toContain('ana');
    expect(panel!.textContent).toContain('1 visita(s)');
    expect(panel!.textContent).toContain(dateInput().value);
  });

  it('confirmar asigna con el operador y la fecha de la cabecera', () => {
    create();
    elegirOperador();
    firstCheckbox()!.click();
    fixture.detectChanges();
    bulkButton().click();
    fixture.detectChanges();

    const fecha = dateInput().value;
    confirmar();

    expect(vi.mocked(service.assign)).toHaveBeenCalledWith({
      operatorId: operator.id,
      date: fecha,
      visitIds: [pendiente.id],
    });
    expect(confirmPanel()).toBeNull();
    expect(fixture.nativeElement.querySelector('.planificacion__feedback--ok').textContent).toContain(
      'Asignadas 1 visita(s)',
    );
    expect(bulkButton().textContent).toContain('(0)');
  });

  it('al confirmar el foco aterriza en el acuse y no se pierde en el body', () => {
    // El fixture tiene que estar en el documento: si no, nada recibe foco y `activeElement` no se
    // mueve del body.
    create();
    document.body.appendChild(fixture.nativeElement);
    elegirOperador();
    firstCheckbox()!.click();
    fixture.detectChanges();

    bulkButton().focus();
    bulkButton().click();
    fixture.detectChanges();

    confirmar();

    // El disparador queda deshabilitado al vaciarse la selección, así que el foco no vuelve ahí:
    // lo que no puede pasar es que se caiga al body y haya que tabular la pantalla entera.
    expect(document.activeElement).toBe(
      fixture.nativeElement.querySelector('.planificacion__feedback--ok'),
    );
  });

  it('cancelar no asigna y deja la seleccion intacta', () => {
    create();
    elegirOperador();
    firstCheckbox()!.click();
    fixture.detectChanges();
    bulkButton().click();
    fixture.detectChanges();

    cancelar();

    expect(vi.mocked(service.assign)).not.toHaveBeenCalled();
    expect(confirmPanel()).toBeNull();
    // Cancelar es arrepentirse de asignar, no perder lo que se venía marcando.
    expect(bulkButton().textContent).toContain('(1)');
    expect(firstCheckbox()!.checked).toBe(true);
  });

  it('el input de fecha no ofrece dias ya pasados', () => {
    create();

    // El piso es el día del supervisor, no el de UTC: comparar contra `toISOString()` haría fallar
    // el test todas las noches, en la franja en que el huso local y el UTC ya no coinciden.
    const hoyLocal = new Date();
    const esperado = [
      hoyLocal.getFullYear(),
      String(hoyLocal.getMonth() + 1).padStart(2, '0'),
      String(hoyLocal.getDate()).padStart(2, '0'),
    ].join('-');
    expect(dateInput().getAttribute('min')).toBe(esperado);
  });

  it('con una fecha ya transcurrida la confirmacion lo advierte', () => {
    create();
    elegirOperador();
    ponerFecha('2020-01-15');
    firstCheckbox()!.click();
    fixture.detectChanges();
    bulkButton().click();
    fixture.detectChanges();

    const advertencia = fixture.nativeElement.querySelector('.planificacion__confirm-warning');
    expect(advertencia).not.toBeNull();
    expect(advertencia.textContent).toContain('ya pasó');
    expect(confirmPanel()!.textContent).toContain('2020-01-15');
  });

  it('con la fecha de hoy la confirmacion no advierte nada', () => {
    create();
    elegirOperador();
    firstCheckbox()!.click();
    fixture.detectChanges();
    bulkButton().click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.planificacion__confirm-warning')).toBeNull();
  });

  it('filtra por estado y urgencia al cambiar los selects', () => {
    create();
    elegirOperador();

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

  it('la accion rapida de la fila tambien pasa por la confirmacion', () => {
    create();
    elegirOperador();

    fixture.nativeElement.querySelectorAll('.planificacion__link')[0].click();
    fixture.detectChanges();

    expect(vi.mocked(service.assign)).not.toHaveBeenCalled();
    expect(confirmPanel()).not.toBeNull();

    confirmar();

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

  it('marca las actas sincronizadas en diferido y no toca a las demas', () => {
    vi.mocked(service.getVisits).mockReturnValue(of([pendiente, diferida]));
    create();

    const marcas = fixture.nativeElement.querySelectorAll('.planificacion__deferred');
    expect(marcas.length).toBe(1);
    expect(marcas[0].textContent.trim()).toBe('Diferida');

    // La fila que llegó en línea no muestra nada: lo excepcional es lo que tiene que saltar a la vista.
    const filas = fixture.nativeElement.querySelectorAll('.planificacion__table tbody tr');
    expect(filas[0].querySelector('.planificacion__deferred')).toBeNull();
    expect(filas[1].querySelector('.planificacion__deferred')).not.toBeNull();
  });

  it('el cuando de la sincronizacion queda en el titulo accesible de la marca', () => {
    vi.mocked(service.getVisits).mockReturnValue(of([diferida]));
    create();

    const marca = fixture.nativeElement.querySelector('.planificacion__deferred');
    expect(marca.getAttribute('title')).toContain('sin conexión');
    expect(marca.getAttribute('title')).toContain('2026');
  });

  it('una visita diferida sin fecha no muestra una fecha inventada', () => {
    vi.mocked(service.getVisits).mockReturnValue(of([{ ...diferida, syncedAt: null }]));
    create();

    const titulo = fixture.nativeElement
      .querySelector('.planificacion__deferred')
      .getAttribute('title');
    expect(titulo).toBe('El acta se cargó sin conexión y se sincronizó después.');
  });

  it('muestra la hoja de ruta del operador con su orden', () => {
    create();
    elegirOperador();

    const items = fixture.nativeElement.querySelectorAll('.planificacion__route-item');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('V-1001');
    expect(items[0].textContent).toContain('1');
  });
});