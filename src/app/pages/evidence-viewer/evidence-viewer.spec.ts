import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EvidenceItem } from '../../core/models/evidence.model';
import { EvidenceService } from '../../core/services/evidence.service';
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
    const service = {
      getEvidences: vi.fn(() => of([evidencia])),
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

    (document.activeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
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
});
