import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import type {
  EvidenceItem,
  VisitManifest,
  VerificationResult,
} from '../../core/models/evidence.model';
import { AppDatePipe, LabelPipe, ShortIdPipe } from '../../core/display/display.pipes';
import { apiErrorCode, visitAccessMessage } from '../../core/http/visit-access';
import { EvidenceService } from '../../core/services/evidence.service';
import { FocusTrap } from '../../shared/directives/focus-trap';
import { VisitsApiService } from '../../visits/visits-api.service';

@Component({
  selector: 'app-evidence-viewer',
  imports: [CommonModule, RouterLink, FocusTrap, LabelPipe, ShortIdPipe, AppDatePipe],
  templateUrl: './evidence-viewer.html',
  styleUrl: './evidence-viewer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvidenceViewer implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly evidenceService = inject(EvidenceService);
  private readonly visitsApi = inject(VisitsApiService);

  protected readonly visitId = signal<string>('');
  /** Código de la visita (el que el supervisor conoce). Vacío hasta que llega, o si no se puede leer. */
  protected readonly visitCode = signal<string>('');
  protected readonly evidences = signal<EvidenceItem[]>([]);
  protected readonly manifest = signal<VisitManifest | null>(null);
  protected readonly verification = signal<VerificationResult | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly loadingManifest = signal<boolean>(true);
  protected readonly verifying = signal<boolean>(false);
  protected readonly selectedEvidence = signal<EvidenceItem | null>(null);
  /** URLs locales (blob:) generadas para mostrar cada imagen de forma autenticada. */
  protected readonly evidenceUrls = signal<Record<string, string>>({});
  /** Registro de evidencias cuyo binario no se pudo descargar. */
  protected readonly evidenceErrors = signal<Record<string, boolean>>({});
  /** Registro de evidencias en proceso de descarga de binario. */
  protected readonly evidenceLoading = signal<Record<string, boolean>>({});
  /**
   * Por qué no se puede mostrar la visita: sin acceso (403) o inexistente (404). Mientras esté, la
   * pantalla no muestra custodia ni evidencias: sin esto, una visita ajena se veía «pendiente de
   * sellado» y vacía, que es información falsa (PLAN-63).
   */
  protected readonly accessError = signal<string | null>(null);
  /**
   * El manifiesto no se pudo consultar por otro motivo (un 500, por ejemplo). Se muestra dentro de la
   * tarjeta del manifiesto: las evidencias que sí cargaron siguen a la vista.
   */
  protected readonly manifestError = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('visitId') ?? '';
    this.visitId.set(id);
    if (id) {
      this.loadData(id);
    }
  }

  ngOnDestroy(): void {
    this.revokeAllBlobUrls();
  }

  private revokeAllBlobUrls(): void {
    const urls = Object.values(this.evidenceUrls());
    for (const url of urls) {
      if (url) {
        URL.revokeObjectURL(url);
      }
    }
    this.evidenceUrls.set({});
    this.evidenceErrors.set({});
    this.evidenceLoading.set({});
  }

  protected loadData(id: string): void {
    this.revokeAllBlobUrls();
    this.loading.set(true);
    this.loadingManifest.set(true);
    this.accessError.set(null);
    this.manifestError.set(null);
    // Sólo para el título: si falla (un operador no tiene permiso sobre ese endpoint), el título
    // cae al UUID abreviado y el resto de la pantalla sigue igual.
    this.visitsApi.getVisitWithForm(id).subscribe({
      next: (visit) => this.visitCode.set(visit.code),
      error: () => this.visitCode.set(''),
    });
    this.evidenceService.getEvidences(id).subscribe({
      next: (items) => {
        this.evidences.set(items);
        this.loading.set(false);
        this.loadEvidenceBlobs(id, items);
      },
      // `/evidences` decide el acceso: lo pueden pedir los tres roles, así que su 403 es siempre por
      // jurisdicción o asignación. El 403 del título (`/formulario`) no sirve: al operador se lo
      // devuelve por su rol aunque la visita sea suya.
      error: (error: unknown) => {
        this.accessError.set(visitAccessMessage(error) ?? 'No se pudieron cargar las evidencias.');
        this.loading.set(false);
      },
    });

    this.evidenceService.getManifest(id).subscribe({
      next: (m) => {
        this.manifest.set(m);
        this.loadingManifest.set(false);
      },
      // «Pendiente de sellado» es un estado de la visita, no un error: sólo corresponde cuando el
      // backend dice que no hay manifiesto. Un 403 o 404 hace inaccesible la visita entera; cualquier
      // otro error es sólo del manifiesto y no tiene que tapar las evidencias que sí cargaron.
      error: (error: unknown) => {
        this.manifest.set(null);
        if (apiErrorCode(error) !== 'manifest_not_found') {
          const access = visitAccessMessage(error);
          if (access) {
            if (!this.accessError()) {
              this.accessError.set(access);
            }
          } else {
            this.manifestError.set('No se pudo consultar el sellado de la visita.');
          }
        }
        this.loadingManifest.set(false);
      },
    });
  }

  private loadEvidenceBlobs(visitId: string, items: EvidenceItem[]): void {
    for (const item of items) {
      this.evidenceLoading.update((m) => ({ ...m, [item.id]: true }));
      this.evidenceService.getEvidenceFileBlob(visitId, item.id).subscribe({
        next: (blob) => {
          if (this.visitId() !== visitId) return;
          const url = URL.createObjectURL(blob);
          this.evidenceUrls.update((m) => ({ ...m, [item.id]: url }));
          this.evidenceLoading.update((m) => ({ ...m, [item.id]: false }));
        },
        error: () => {
          if (this.visitId() !== visitId) return;
          this.evidenceErrors.update((m) => ({ ...m, [item.id]: true }));
          this.evidenceLoading.update((m) => ({ ...m, [item.id]: false }));
        },
      });
    }
  }

  protected verify(): void {
    const id = this.visitId();
    if (!id) return;
    this.verifying.set(true);
    this.evidenceService.verifyManifest(id).subscribe({
      next: (res) => {
        this.verification.set(res);
        this.verifying.set(false);
      },
      error: () => {
        this.verifying.set(false);
      },
    });
  }

  protected selectEvidence(item: EvidenceItem): void {
    this.selectedEvidence.set(item);
  }

  protected closeSelected(): void {
    this.selectedEvidence.set(null);
  }

  protected getEvidenceUrl(item: EvidenceItem): string | null {
    return this.evidenceUrls()[item.id] ?? null;
  }

  protected hasEvidenceError(item: EvidenceItem): boolean {
    return Boolean(this.evidenceErrors()[item.id]);
  }

  protected isEvidenceLoading(item: EvidenceItem): boolean {
    return Boolean(this.evidenceLoading()[item.id]);
  }

  protected getFileUrl(item: EvidenceItem): string {
    return this.evidenceService.getEvidenceFileUrl(this.visitId(), item.id);
  }
}
