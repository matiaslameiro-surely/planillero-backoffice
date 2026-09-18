import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type {
  Operator,
  RouteSheet,
  Visit,
  VisitStatus,
  VisitUrgency,
} from '../../core/models/planificacion.model';
import { PlanificacionService } from '../../core/services/planificacion.service';
import { RouteMap } from './route-map/route-map';

/** Fecha de hoy en `YYYY-MM-DD` (la del reloj local del supervisor). */
function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

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

const ESTADOS: { value: VisitStatus | ''; label: string }[] = [
  { value: '', label: 'Estado (todos)' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'ASSIGNED', label: 'Asignada' },
  { value: 'COMPLETED', label: 'Completada' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

const URGENCIAS: { value: VisitUrgency | ''; label: string }[] = [
  { value: '', label: 'Urgencia (todas)' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'LOW', label: 'Baja' },
];

/**
 * Pantalla de planificación de rutas, sóla para supervisores.
 *
 * Combina la grilla propia (sin librerías), los filtros y el mapa Leaflet: se elige fecha y
 * operador, se filtran visitas por estado y urgencia, se marcan las que van y se asignan de una.
 * Reasignar es asignarle a otro operador: el backend suelta la hoja anterior.
 */
@Component({
  selector: 'app-planificacion',
  imports: [RouterLink, RouteMap],
  templateUrl: './planificacion.html',
  styleUrl: './planificacion.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Planificacion {
  private readonly planificacion = inject(PlanificacionService);

  protected readonly operators = signal<Operator[]>([]);
  protected readonly selectedOperatorId = signal<string>('');
  protected readonly selectedDate = signal<string>(todayIso());
  protected readonly statusFilter = signal<VisitStatus | ''>('');
  protected readonly urgencyFilter = signal<VisitUrgency | ''>('');

  protected readonly visits = signal<Visit[]>([]);
  protected readonly routeSheet = signal<RouteSheet | null>(null);
  protected readonly selected = signal<ReadonlySet<string>>(new Set());

  protected readonly loading = signal(false);
  protected readonly assigning = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  protected readonly estados = ESTADOS;
  protected readonly urgencias = URGENCIAS;

  /** Visitas de la hoja de ruta seleccionada, para el mapa. */
  protected readonly routeVisits = computed<Visit[]>(
    () => this.routeSheet()?.items.map((i) => i.visit) ?? [],
  );
  protected readonly selectedCount = computed(() => this.selected().size);

  constructor() {
    this.loadOperators();
    this.reloadVisits();
    this.reloadRouteSheet();
  }

  protected onDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      this.selectedDate.set(value);
      this.reloadVisits();
      this.reloadRouteSheet();
    }
  }

  protected onOperatorChange(event: Event): void {
    this.selectedOperatorId.set((event.target as HTMLSelectElement).value);
    this.reloadVisits();
    this.reloadRouteSheet();
  }

  protected onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as VisitStatus | '');
    this.reloadVisits();
  }

  protected onUrgencyChange(event: Event): void {
    this.urgencyFilter.set((event.target as HTMLSelectElement).value as VisitUrgency | '');
    this.reloadVisits();
  }

  protected isSelectable(visit: Visit): boolean {
    return visit.status !== 'COMPLETED' && visit.status !== 'CANCELLED';
  }

  /** Marca o desmarca una visita para la asignación en bloque. */
  protected toggle(visitId: string, checked: boolean): void {
    const next = new Set(this.selected());
    if (checked) {
      next.add(visitId);
    } else {
      next.delete(visitId);
    }
    this.selected.set(next);
  }

  protected assignSelected(): void {
    this.assign([...this.selected()]);
  }

  /** Acción rápida: asigna una sola visita al operador y fecha de la cabecera. */
  protected assignSingle(visit: Visit): void {
    this.assign([visit.id]);
  }

  private assign(visitIds: string[]): void {
    const operatorId = this.selectedOperatorId();
    if (!operatorId || visitIds.length === 0) {
      return;
    }

    this.error.set(null);
    this.notice.set(null);
    this.assigning.set(true);
    this.planificacion
      .assign({ operatorId, date: this.selectedDate(), visitIds })
      .subscribe({
        next: (sheet) => {
          this.assigning.set(false);
          this.selected.set(new Set());
          this.notice.set(
            `Asignadas ${visitIds.length} visita(s) a ${sheet.operatorUsername} para ${sheet.date}.`,
          );
          if (sheet.operatorId === this.selectedOperatorId()) {
            this.routeSheet.set(sheet);
          }
          this.reloadVisits();
        },
        error: (error: unknown) => {
          this.assigning.set(false);
          this.error.set(messageOf(error));
        },
      });
  }

  private loadOperators(): void {
    this.planificacion.getOperators().subscribe({
      next: (operators) => {
        this.operators.set(operators);
        if (operators.length > 0 && !this.selectedOperatorId()) {
          this.selectedOperatorId.set(operators[0].id);
          this.reloadRouteSheet();
        }
      },
      error: (error: unknown) => this.error.set(messageOf(error)),
    });
  }

  private reloadVisits(): void {
    this.loading.set(true);
    const operatorId = this.selectedOperatorId() || undefined;
    this.planificacion
      .getVisits({
        status: this.statusFilter() || undefined,
        urgency: this.urgencyFilter() || undefined,
        operatorId,
        // El parámetro date solo tiene sentido acotado a un operador: sin operador, la grilla
        // muestra toda la jurisdicción y `date` solo devolvería visitas ya asignadas.
        date: operatorId ? this.selectedDate() : undefined,
      })
      .subscribe({
        next: (visits) => {
          this.loading.set(false);
          this.visits.set(visits);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(messageOf(error));
        },
      });
  }

  private reloadRouteSheet(): void {
    const operatorId = this.selectedOperatorId();
    if (!operatorId) {
      this.routeSheet.set(null);
      return;
    }
    this.planificacion.getRouteSheet(operatorId, this.selectedDate()).subscribe({
      next: (sheet) => this.routeSheet.set(sheet),
      error: (error: unknown) => this.error.set(messageOf(error)),
    });
  }
}