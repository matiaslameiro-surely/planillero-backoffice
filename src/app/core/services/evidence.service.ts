import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import type {
  EvidenceItem,
  VisitManifest,
  VerificationResult,
} from '../models/evidence.model';

@Injectable({ providedIn: 'root' })
export class EvidenceService {
  private readonly http = inject(HttpClient);

  /** Obtiene la lista de evidencias custodiadas para la visita. */
  getEvidences(visitId: string): Observable<EvidenceItem[]> {
    return this.http.get<EvidenceItem[]>(
      `${environment.apiUrl}/api/v1/visits/${visitId}/evidences`,
    );
  }

  /** URL directa para visualización del binario en la galería pericial. */
  getEvidenceFileUrl(visitId: string, evidenceId: string): string {
    return `${environment.apiUrl}/api/v1/visits/${visitId}/evidences/${evidenceId}/file`;
  }

  /** Descarga el binario de la evidencia como Blob pasando por el interceptor de autenticación. */
  getEvidenceFileBlob(visitId: string, evidenceId: string): Observable<Blob> {
    return this.http.get(
      `${environment.apiUrl}/api/v1/visits/${visitId}/evidences/${evidenceId}/file`,
      { responseType: 'blob' },
    );
  }

  /** Obtiene el último manifiesto criptográfico de la visita. */
  getManifest(visitId: string): Observable<VisitManifest> {
    return this.http.get<VisitManifest>(
      `${environment.apiUrl}/api/v1/visits/${visitId}/manifest`,
    );
  }

  /** Audita la integridad pericial del manifiesto y los binarios en tiempo real. */
  verifyManifest(visitId: string): Observable<VerificationResult> {
    return this.http.post<VerificationResult>(
      `${environment.apiUrl}/api/v1/visits/${visitId}/manifest/verify`,
      {},
    );
  }
}
