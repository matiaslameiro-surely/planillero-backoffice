import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppDatePipe, LabelPipe, ShortIdPipe } from '../../core/display/display.pipes';
import {
  AUDIT_ENTITY_TYPE_DESCRIPTIONS,
  AUDIT_EVENT_TYPES,
  eventTypeInfo,
} from '../../core/models/audit-event-types';
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

const PAGE_SIZE = 20;

/** Inicio del día local elegido (`yyyy-MM-dd`), como instante ISO para el parámetro `from`. */
function startOfDay(date: string): string | undefined {
  const [year, month, day] = date.split('-').map(Number);
  return date ? new Date(year, month - 1, day).toISOString() : undefined;
}

/** Fin del día local elegido, como instante ISO para el parámetro `to`. */
function endOfDay(date: string): string | undefined {
  const [year, month, day] = date.split('-').map(Number);
  return date ? new Date(year, month - 1, day, 23, 59, 59, 999).toISOString() : undefined;
}

/**
 * Pantalla de auditoría, sólo para administradores.
 *
 * Lista los eventos con filtros (tipo de evento, usuario y rango de fechas), paginados, y ofrece verificar la integridad de la cadena de hashes, completa
 * o de una visita puntual (botón "Auditar Integridad de Visita").
 */
@Component({
  selector: 'app-auditoria',
  imports: [RouterLink, LabelPipe, ShortIdPipe, AppDatePipe],
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
  protected readonly fromFilter = signal('');
  protected readonly toFilter = signal('');

  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);
  protected readonly hasPrevious = computed(() => this.page() > 0);
  protected readonly hasNext = computed(() => this.page() + 1 < this.totalPages());

  protected readonly eventTypes = AUDIT_EVENT_TYPES;

  protected readonly verifyVisitId = signal('');
  protected readonly verifying = signal(false);
  protected readonly verificationResult = signal<ChainVerificationResult | null>(null);

  constructor() {
    this.reload();
  }

  protected onEventTypeChange(event: Event): void {
    this.eventTypeFilter.set((event.target as HTMLSelectElement).value);
    this.applyFilters();
  }

  protected onUsernameChange(event: Event): void {
    this.usernameFilter.set((event.target as HTMLInputElement).value);
    this.applyFilters();
  }

  protected onFromChange(event: Event): void {
    this.fromFilter.set((event.target as HTMLInputElement).value);
    this.applyFilters();
  }

  protected onToChange(event: Event): void {
    this.toFilter.set((event.target as HTMLInputElement).value);
    this.applyFilters();
  }

  protected previousPage(): void {
    if (this.hasPrevious()) {
      this.page.update((page) => page - 1);
      this.reload();
    }
  }

  protected nextPage(): void {
    if (this.hasNext()) {
      this.page.update((page) => page + 1);
      this.reload();
    }
  }

  /** Nombre legible del evento, o el código crudo si el backend agrega uno que acá no se conoce. */
  protected eventLabel(code: string): string {
    return eventTypeInfo(code)?.label ?? code;
  }

  /** Descripción para el tooltip del badge. El código crudo va acá, como dato secundario. */
  protected eventDescription(code: string): string {
    const description = eventTypeInfo(code)?.description ?? 'Tipo de evento sin descripción registrada.';
    return `${description} (código ${code})`;
  }

  protected eventTone(code: string): string {
    return eventTypeInfo(code)?.tone ?? 'neutral';
  }

  protected entityDescription(code: string): string {
    return AUDIT_ENTITY_TYPE_DESCRIPTIONS[code] ?? 'Tipo de entidad sin descripción registrada.';
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

  /** Un cambio de filtro vuelve a la primera página: la actual puede no existir con el nuevo filtro. */
  private applyFilters(): void {
    this.page.set(0);
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.audit
      .getLogs({
        eventType: this.eventTypeFilter().trim() || undefined,
        username: this.usernameFilter().trim() || undefined,
        from: startOfDay(this.fromFilter()),
        to: endOfDay(this.toFilter()),
        page: this.page(),
        size: PAGE_SIZE,
      })
      .subscribe({
        next: (page) => {
          this.loading.set(false);
          this.logs.set(page.content);
          this.totalPages.set(page.totalPages);
          this.totalElements.set(page.totalElements);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(messageOf(error));
        },
      });
  }
}
