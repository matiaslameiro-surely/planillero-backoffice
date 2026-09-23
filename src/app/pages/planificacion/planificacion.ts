import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import type {
  Operator,
  RouteSheet,
  Visit,
  VisitStatus,
  VisitUrgency,
} from '../../core/models/planificacion.model';
import { PlanificacionService } from '../../core/services/planificacion.service';
import { FocusTrap } from '../../shared/directives/focus-trap';
import { RouteMap } from './route-map/route-map';

/** Asignación a la espera de que el supervisor la confirme. */
interface PendingAssignment {
  readonly operatorId: string;
  readonly operatorUsername: string;
  readonly date: string;
  readonly visitIds: readonly string[];
}

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
 *
 * Asignar es la única acción de la pantalla que le cambia la jornada a una persona real y no tiene
 * deshacer, así que nunca sale directa: las dos formas de disparar la asignación —la de la fila y la
 * de la cabecera— dejan una `PendingAssignment` y la llamada al backend recién ocurre si el
 * supervisor confirma lo que el panel le nombra.
 */
@Component({
  selector: 'app-planificacion',
  imports: [RouterLink, RouteMap, FocusTrap],
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

  /** Asignación esperando confirmación; `null` mientras no haya nada que confirmar. */
  protected readonly pendingAssignment = signal<PendingAssignment | null>(null);

  protected readonly estados = ESTADOS;
  protected readonly urgencias = URGENCIAS;

  /**
   * Día de hoy, como piso del selector de fecha.
   *
   * No alcanza por sí solo —el campo admite tecleado—, pero evita el error más común, que es
   * elegir con el calendario una fecha del mes que ya pasó. Se recalcula en cada lectura y no se
   * congela al construir: esta pantalla queda abierta, y pasada la medianoche un piso viejo
   * volvería a ofrecer un día ya vencido.
   */
  protected get minDate(): string {
    return todayIso();
  }

  /**
   * La fecha ya transcurrió: casi siempre es un error de tipeo, nunca una imposibilidad.
   *
   * Se pregunta por la fecha de la propuesta y no por la de la cabecera, que es la que se va a
   * mandar: son la misma al abrir el panel, pero la advertencia tiene que hablar de lo que se
   * confirma.
   */
  protected isPastDate(date: string): boolean {
    return date < todayIso();
  }

  /** Visitas de la hoja de ruta seleccionada, para el mapa. */
  protected readonly routeVisits = computed<Visit[]>(
    () => this.routeSheet()?.items.map((i) => i.visit) ?? [],
  );
  protected readonly selectedCount = computed(() => this.selected().size);

  /** El acuse de la asignación, que recibe el foco cuando la operación termina bien. */
  private readonly noticeBox = viewChild<ElementRef<HTMLElement>>('noticeBox');

  constructor() {
    // Al terminar de asignar, el botón que abrió la confirmación queda deshabilitado —ya no hay
    // nada marcado—, así que el foco no puede volver ahí. Va al acuse, que es lo que un lector de
    // pantalla tiene que anunciar y lo que alguien que navega con teclado necesita leer.
    effect(() => {
      if (this.notice()) {
        this.noticeBox()?.nativeElement.focus();
      }
    });

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

  /**
   * Detalle de la sincronización diferida, para el título accesible de la marca.
   *
   * La grilla muestra sólo «Diferida» para no competir con el resto de las columnas; el cuándo, que
   * es el dato que hace falta al revisar un expediente, queda a un hover o a un lector de pantalla.
   */
  protected deferredTitle(visit: Visit): string {
    if (!visit.syncedAt) {
      return 'El acta se cargó sin conexión y se sincronizó después.';
    }
    return `El acta se cargó sin conexión y se sincronizó el ${new Date(
      visit.syncedAt,
    ).toLocaleString('es-AR')}.`;
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
    this.requestAssignment([...this.selected()]);
  }

  /** Acción rápida: propone asignar una sola visita al operador y fecha de la cabecera. */
  protected assignSingle(visit: Visit): void {
    this.requestAssignment([visit.id]);
  }

  /** Cierra el panel sin asignar. La selección queda como estaba: cancelar no descarta trabajo. */
  protected cancelAssignment(): void {
    this.pendingAssignment.set(null);
  }

  /**
   * El panel sigue abierto mientras dura la llamada y se cierra recién al terminar.
   *
   * Cerrarlo en el acto dejaba el foco en el aire: el botón que lo abrió queda deshabilitado
   * mientras se asigna, así que devolverle el foco en ese momento no hace nada y el supervisor que
   * navega con teclado termina en el principio del documento.
   */
  protected confirmAssignment(): void {
    const pending = this.pendingAssignment();
    if (!pending || this.assigning()) {
      return;
    }
    this.assign(pending);
  }

  /**
   * Único camino hacia la asignación: arma la propuesta y la deja esperando confirmación.
   *
   * El nombre del operador se resuelve acá, contra la lista cargada, para que el panel pueda
   * nombrarlo. Si el id no está en la lista, se cae al id: es preferible mostrar algo opaco que
   * dejar la confirmación sin destinatario visible, que es justo lo que el hallazgo señala.
   */
  private requestAssignment(visitIds: string[]): void {
    const operatorId = this.selectedOperatorId();
    if (!operatorId || visitIds.length === 0) {
      return;
    }
    const operator = this.operators().find((candidate) => candidate.id === operatorId);
    this.pendingAssignment.set({
      operatorId,
      operatorUsername: operator?.username ?? operatorId,
      date: this.selectedDate(),
      visitIds,
    });
  }

  private assign(pending: PendingAssignment): void {
    const { operatorId, date } = pending;
    const visitIds = [...pending.visitIds];

    this.error.set(null);
    this.notice.set(null);
    this.assigning.set(true);
    this.planificacion
      .assign({ operatorId, date, visitIds })
      .subscribe({
        next: (sheet) => {
          this.assigning.set(false);
          this.pendingAssignment.set(null);
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
          // También se cierra al fallar: el error se informa arriba, sobre la pantalla completa, y
          // dejar el panel abierto invitaría a reintentar a ciegas lo que acaba de fallar.
          this.pendingAssignment.set(null);
          this.error.set(messageOf(error));
        },
      });
  }

  private loadOperators(): void {
    this.planificacion.getOperators().subscribe({
      // Nadie queda preseleccionado a propósito: si el desplegable arranca con un operador, todo
      // parece elegido y un clic puede volcarle la jornada a alguien que el supervisor nunca miró.
      next: (operators) => this.operators.set(operators),
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