/** Tipo de evidencia pericial custodiada. */
export type EvidenceType = 'PHOTO' | 'SIGNATURE';

/** Registro de evidencia pericial devuelto por el backend. */
export interface EvidenceItem {
  id: string;
  visitId: string;
  evidenceType: EvidenceType;
  fileName: string;
  contentType: string;
  fileSize: number;
  sha256Hash: string;
  capturedAt: string;
  createdAt: string;
  metadata?: string;
}

/** Manifiesto criptográfico de la visita pericial sellado con HMAC-SHA256. */
export interface VisitManifest {
  id: string;
  visitId: string;
  userId: string;
  deviceInfo?: string;
  manifestData: string;
  hmacSignature: string;
  verificationStatus: 'VERIFIED' | 'TAMPERED';
  createdAt: string;
}

/** Detalle de verificación pericial para cada evidencia. */
export interface EvidenceVerificationDetail {
  evidenceId: string;
  sha256Expected: string;
  sha256Actual: string;
  intact: boolean;
  status: string;
}

/** Resultado de la auditoría y verificación pericial en tiempo real. */
export interface VerificationResult {
  manifestId: string;
  visitId: string;
  status: 'VERIFIED' | 'TAMPERED';
  signatureValid: boolean;
  allEvidencesIntact: boolean;
  message: string;
  evidences: EvidenceVerificationDetail[];
}
