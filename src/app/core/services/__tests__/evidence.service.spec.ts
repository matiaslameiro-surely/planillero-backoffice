import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import type {
  EvidenceItem,
  VisitManifest,
  VerificationResult,
} from '../../models/evidence.model';
import { EvidenceService } from '../evidence.service';

describe('EvidenceService', () => {
  let service: EvidenceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EvidenceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getEvidences consulta GET /api/v1/visits/:visitId/evidences', () => {
    const mockEvidences: EvidenceItem[] = [
      {
        id: 'ev-1',
        visitId: 'v-100',
        evidenceType: 'PHOTO',
        fileName: 'fachada.jpg',
        contentType: 'image/jpeg',
        fileSize: 50000,
        sha256Hash: 'hash123',
        capturedAt: '2026-09-18T10:00:00Z',
        createdAt: '2026-09-18T10:00:01Z',
      },
    ];

    let result: EvidenceItem[] | undefined;
    service.getEvidences('v-100').subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      `${environment.apiUrl}/api/v1/visits/v-100/evidences`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockEvidences);

    expect(result).toEqual(mockEvidences);
  });

  it('getManifest consulta GET /api/v1/visits/:visitId/manifest', () => {
    const mockManifest: VisitManifest = {
      id: 'm-1',
      visitId: 'v-100',
      userId: 'u-1',
      deviceInfo: 'Android 14',
      manifestData: '{}',
      hmacSignature: 'sig123',
      verificationStatus: 'VERIFIED',
      createdAt: '2026-09-18T10:05:00Z',
    };

    let result: VisitManifest | undefined;
    service.getManifest('v-100').subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      `${environment.apiUrl}/api/v1/visits/v-100/manifest`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockManifest);

    expect(result).toEqual(mockManifest);
  });

  it('verifyManifest consulta POST /api/v1/visits/:visitId/manifest/verify', () => {
    const mockVerification: VerificationResult = {
      manifestId: 'm-1',
      visitId: 'v-100',
      status: 'VERIFIED',
      signatureValid: true,
      allEvidencesIntact: true,
      message: 'Integridad validada',
      evidences: [],
    };

    let result: VerificationResult | undefined;
    service.verifyManifest('v-100').subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      `${environment.apiUrl}/api/v1/visits/v-100/manifest/verify`,
    );
    expect(req.request.method).toBe('POST');
    req.flush(mockVerification);

    expect(result).toEqual(mockVerification);
  });

  it('getEvidenceFileUrl construye la URL correcta para el binario', () => {
    const url = service.getEvidenceFileUrl('v-100', 'ev-1');
    expect(url).toBe(
      `${environment.apiUrl}/api/v1/visits/v-100/evidences/ev-1/file`,
    );
  });
});
