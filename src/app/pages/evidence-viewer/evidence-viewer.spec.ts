import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EvidenceItem } from '../../core/models/evidence.model';
import { EvidenceService } from '../../core/services/evidence.service';
import { VisitsApiService } from '../../visits/visits-api.service';
import { EvidenceViewer } from './evidence-viewer';

/**
 * Tests del visor de evidencias, centrados en el modal de inspección.
 *
 * El modal se abre desde una tarjeta que queda detrás: lo que se verifica acá es que el foco entre
 * al modal, que Escape lo cierre —antes colgaba de un div que nunca recibía foco, así que no hacía
 * nada— y que el foco vuelva a la tarjeta al cerrarse.
 */
describe('EvidenceViewer', () => {
  const evidencia: EvidenceItem = {
    id: 'ev-1',
    visitId: 'v-100',
    evidenceType: 'PHOTO',
    fileName: 'fachada.jpg',
    contentType: 'image/jpeg',
    fileSize: 50000,
    sha256Hash: 'hash123',
    capturedAt: '2026-09-18T10:00:00Z',
    createdAt: '2026-09-18T10:00:01Z',
  };

  let fixture: ComponentFixture<EvidenceViewer>;

  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/mock-blob-123');
    vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined);

    const service = {
      getEvidences: vi.fn(() => of([evidencia])),
      getEvidenceFileBlob: vi.fn(() => of(new Blob(['test-binary'], { type: 'image/jpeg' }))),
      getManifest: vi.fn(() => of(null)),
      verifyManifest: vi.fn(() => of(null)),
      getEvidenceFileUrl: vi.fn(() => '/api/v1/visits/v-100/evidences/ev-1/file'),
    } as unknown as EvidenceService;

    TestBed.configureTestingModule({
      imports: [EvidenceViewer],
      providers: [
        { provide: EvidenceService, useValue: service },
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'v-100' } } },
        },
      ],
    });

    fixture = TestBed.createComponent(EvidenceViewer);
    // Sin el fixture en el documento nada recibe foco y `activeElement` no se mueve del body.
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  function tarjeta(): HTMLElement {
    return fixture.nativeElement.querySelector('.evidence-card');
  }

  function modal(): HTMLElement | null {
    return fixture.nativeElement.querySelector('[role="dialog"]');
  }

  function abrir(): void {
    tarjeta().focus();
    tarjeta().click();
    fixture.detectChanges();
  }

  it('el modal recibe el foco al abrirse', () => {
    abrir();

    expect(modal()).not.toBeNull();
    expect(modal()!.contains(document.activeElement)).toBe(true);
    expect((document.activeElement as HTMLElement).classList).toContain('close-btn');
  });

  it('Escape cierra el modal desde cualquier punto de su contenido', () => {
    abrir();

    // Desde un nodo profundo del contenido y no desde el botón de cerrar: el modal se abre con el
    // foco en cualquier parte y Escape tiene que llegar igual al contenedor.
    const profundo: HTMLElement = fixture.nativeElement.querySelector(
      '.evidence-metadata-panel code',
    );
    expect(profundo).not.toBeNull();
    profundo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(modal()).toBeNull();
  });

  it('al cerrarse devuelve el foco a la tarjeta que lo abrio', () => {
    abrir();

    fixture.nativeElement.querySelector('.close-btn').click();
    fixture.detectChanges();

    expect(modal()).toBeNull();
    expect(document.activeElement).toBe(tarjeta());
  });

  it('descarga el binario como blob y renderiza la imagen con la URL creada en tarjeta y modal', () => {
    expect(URL.createObjectURL).toHaveBeenCalled();
    const imgTarjeta: HTMLImageElement | null = fixture.nativeElement.querySelector('.card-preview img');
    expect(imgTarjeta).not.toBeNull();
    expect(imgTarjeta?.src).toBe('blob:http://localhost/mock-blob-123');

    abrir();
    const imgModal: HTMLImageElement | null = modal()!.querySelector('.image-wrapper img');
    expect(imgModal).not.toBeNull();
    expect(imgModal?.src).toBe('blob:http://localhost/mock-blob-123');
  });

  it('libera las URLs blob mediante revokeObjectURL al destruir el componente', () => {
    fixture.destroy();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-blob-123');
  });
});

describe('EvidenceViewer ante error al descargar la imagen de evidencia (PLAN-80)', () => {
  const evidencia: EvidenceItem = {
    id: 'ev-1',
    visitId: 'v-100',
    evidenceType: 'PHOTO',
    fileName: 'fachada.jpg',
    contentType: 'image/jpeg',
    fileSize: 50000,
    sha256Hash: 'hash123',
    capturedAt: '2026-09-18T10:00:00Z',
    createdAt: '2026-09-18T10:00:01Z',
  };

  it('muestra un aviso de error en la tarjeta y en el modal en vez de una imagen rota', () => {
    const service = {
      getEvidences: vi.fn(() => of([evidencia])),
      getEvidenceFileBlob: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 401 }))),
      getManifest: vi.fn(() => of(null)),
      verifyManifest: vi.fn(() => of(null)),
      getEvidenceFileUrl: vi.fn(() => '/api/v1/visits/v-100/evidences/ev-1/file'),
    } as unknown as EvidenceService;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [EvidenceViewer],
      providers: [
        { provide: EvidenceService, useValue: service },
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'v-100' } } },
        },
      ],
    });

    const fixture = TestBed.createComponent(EvidenceViewer);
    fixture.detectChanges();

    const errorTarjeta = fixture.nativeElement.querySelector('.card-preview .image-error');
    expect(errorTarjeta).not.toBeNull();
    expect(errorTarjeta?.textContent).toContain('No se pudo cargar la imagen');
    expect(fixture.nativeElement.querySelector('.card-preview img')).toBeNull();

    // Abrir modal
    const tarjeta = fixture.nativeElement.querySelector('.evidence-card');
    tarjeta.click();
    fixture.detectChanges();

    const errorModal = fixture.nativeElement.querySelector('.image-wrapper .image-error');
    expect(errorModal).not.toBeNull();
    expect(errorModal?.textContent).toContain('No se pudo cargar la imagen');
    expect(fixture.nativeElement.querySelector('.image-wrapper img')).toBeNull();
  });
});

/**
 * PLAN-63: una visita ajena o inexistente no se muestra como «pendiente de sellado» y vacía.
 *
 * `/evidences` decide el acceso porque lo pueden pedir los tres roles; el 403 del título
 * (`/formulario`) no cuenta, porque al operador se lo devuelve su rol aunque la visita sea suya.
 */
describe('EvidenceViewer ante visitas sin acceso o inexistentes', () => {
  const http = (status: number, code: string) => new HttpErrorResponse({ status, error: { error: code } });

  let service: EvidenceService;
  let visitsApi: VisitsApiService;

  function crear(): HTMLElement {
    TestBed.configureTestingModule({
      imports: [EvidenceViewer],
      providers: [
        { provide: EvidenceService, useValue: service },
        { provide: VisitsApiService, useValue: visitsApi },
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'v-200' } } } },
      ],
    });
    const fixture = TestBed.createComponent(EvidenceViewer);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    service = {
      getEvidences: vi.fn(() => of([])),
      getManifest: vi.fn(() => throwError(() => http(404, 'manifest_not_found'))),
      verifyManifest: vi.fn(),
      getEvidenceFileUrl: vi.fn(() => ''),
    } as unknown as EvidenceService;
    visitsApi = {
      getVisitWithForm: vi.fn(() => of({ code: 'V-2001' })),
    } as unknown as VisitsApiService;
  });

  it('ante un 403 dice que no tenés acceso y no muestra custodia ni evidencias', () => {
    vi.mocked(service.getEvidences).mockReturnValue(throwError(() => http(403, 'outside_jurisdiction')));
    vi.mocked(service.getManifest).mockReturnValue(throwError(() => http(403, 'outside_jurisdiction')));
    vi.mocked(visitsApi.getVisitWithForm).mockReturnValue(throwError(() => http(403, 'outside_jurisdiction')));
    const el = crear();

    expect(el.querySelector('.access-error')?.textContent).toContain('No tenés acceso a esta visita.');
    expect(el.textContent).not.toContain('PENDIENTE DE SELLADO');
    expect(el.querySelector('.manifest-card')).toBeNull();
    expect(el.querySelector('.gallery-section')).toBeNull();
    expect(el.querySelector('.verify-btn')).toBeNull();
    expect(el.querySelector('a.back-link')).not.toBeNull();
  });

  it('ante un 404 dice que la visita no existe', () => {
    vi.mocked(service.getEvidences).mockReturnValue(throwError(() => http(404, 'visit_not_found')));
    vi.mocked(service.getManifest).mockReturnValue(throwError(() => http(404, 'visit_not_found')));
    const el = crear();

    expect(el.querySelector('.access-error')?.textContent).toContain('La visita no existe.');
    expect(el.querySelector('.manifest-card')).toBeNull();
  });

  it('una visita accesible sin manifiesto sigue «pendiente de sellado»', () => {
    const el = crear();

    expect(el.querySelector('.access-error')).toBeNull();
    expect(el.textContent).toContain('PENDIENTE DE SELLADO');
    expect(el.querySelector('.gallery-section')).not.toBeNull();
  });

  it('el 403 del título (operador sin permiso sobre /formulario) no cuenta como «sin acceso»', () => {
    vi.mocked(visitsApi.getVisitWithForm).mockReturnValue(throwError(() => http(403, 'forbidden')));
    const el = crear();

    expect(el.querySelector('.access-error')).toBeNull();
    expect(el.querySelector('.manifest-card')).not.toBeNull();
    expect(el.querySelector('.gallery-section')).not.toBeNull();
  });

  it('un error del manifiesto que no es «no hay manifiesto» se dice en su tarjeta y no tapa la galería', () => {
    vi.mocked(service.getManifest).mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const el = crear();

    expect(el.textContent).not.toContain('PENDIENTE DE SELLADO');
    expect(el.querySelector('.access-error')).toBeNull();
    expect(el.querySelector('.manifest-card .manifest-error')?.textContent).toContain(
      'No se pudo consultar el sellado de la visita.',
    );
    expect(el.querySelector('.manifest-card .status-error')?.textContent).toContain('SELLADO NO DISPONIBLE');
    expect(el.querySelector('.gallery-section')).not.toBeNull();
  });

  it('un 403 del manifiesto sí hace inaccesible la visita', () => {
    vi.mocked(service.getManifest).mockReturnValue(throwError(() => http(403, 'outside_jurisdiction')));
    const el = crear();

    expect(el.querySelector('.access-error')?.textContent).toContain('No tenés acceso a esta visita.');
    expect(el.querySelector('.gallery-section')).toBeNull();
  });
});
