import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { AuditLogEntry, ChainVerificationResult } from '../../core/models/audit.model';
import { AuditService } from '../../core/services/audit.service';

/** Extrae el `message` del cuerpo de error del backend, o un texto genérico. */
function messageOf(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: string } | null;
    return body?.message ?? `No se pudo completar la operación (${error.status}).`;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'No se pudo completar la operación.';
}

/**
 * Pantalla de auditoría, sólo para administradores.
 *
 * Lista los eventos con filtros y ofrece verificar la integridad de la cadena de hashes, completa
 * o de una visita puntual (botón "Auditar Integridad de Visita").
 */
@Component({
  selector: 'app-auditoria',
  imports: [RouterLink],
  templateUrl: './auditoria.html',
  styleUrl: './auditoria.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Auditoria {
  private readonly audit = inject(AuditService);

  protected readonly logs = signal<AuditLogEntry[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly eventTypeFilter = signal('');
  protected readonly usernameFilter = signal('');

  protected readonly verifyVisitId = signal('');
  protected readonly verifying = signal(false);
  protected readonly verificationResult = signal<ChainVerificationResult | null>(null);

  constructor() {
    this.reload();
  }

  protected onEventTypeChange(event: Event): void {
    this.eventTypeFilter.set((event.target as HTMLInputElement).value);
    this.reload();
  }

  protected onUsernameChange(event: Event): void {
    this.usernameFilter.set((event.target as HTMLInputElement).value);
    this.reload();
  }

  protected onVerifyVisitIdChange(event: Event): void {
    this.verifyVisitId.set((event.target as HTMLInputElement).value);
  }

  /** "Auditar Integridad de Visita": con el campo vacío verifica la cadena completa. */
  protected verifyIntegrity(): void {
    this.verifying.set(true);
    this.verificationResult.set(null);
    this.error.set(null);
    const visitId = this.verifyVisitId().trim() || undefined;
    this.audit.verify(visitId).subscribe({
      next: (result) => {
        this.verifying.set(false);
        this.verificationResult.set(result);
      },
      error: (error: unknown) => {
        this.verifying.set(false);
        this.error.set(messageOf(error));
      },
    });
  }

  private reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.audit
      .getLogs({
        eventType: this.eventTypeFilter().trim() || undefined,
        username: this.usernameFilter().trim() || undefined,
      })
      .subscribe({
        next: (page) => {
          this.loading.set(false);
          this.logs.set(page.content);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(messageOf(error));
        },
      });
  }
}
