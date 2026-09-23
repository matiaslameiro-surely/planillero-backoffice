import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
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
export class EvidenceViewer implements OnInit {
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

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('visitId') ?? '';
    this.visitId.set(id);
    if (id) {
      this.loadData(id);
    }
  }

  protected loadData(id: string): void {
    this.loading.set(true);
    this.loadingManifest.set(true);
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
      },
      error: () => {
        this.loading.set(false);
      },
    });

    this.evidenceService.getManifest(id).subscribe({
      next: (m) => {
        this.manifest.set(m);
        this.loadingManifest.set(false);
      },
      error: () => {
        this.manifest.set(null);
        this.loadingManifest.set(false);
      },
    });
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

  protected getFileUrl(item: EvidenceItem): string {
    return this.evidenceService.getEvidenceFileUrl(this.visitId(), item.id);
  }
}
