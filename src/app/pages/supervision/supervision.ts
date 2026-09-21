import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';

import type { DashboardSummary, OperatorLiveStatus } from '../../core/models/supervision.model';
import { SupervisionService } from '../../core/services/supervision.service';
import { SupervisionMap } from './supervision-map/supervision-map';

/**
 * Pantalla principal del Tablero Central de Supervisión, Mapa Operativo y Monitoreo de Excepciones.
 */
@Component({
  selector: 'app-supervision',
  standalone: true,
  imports: [CommonModule, FormsModule, SupervisionMap],
  templateUrl: './supervision.html',
  styleUrl: './supervision.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Supervision implements OnInit, OnDestroy {
  private readonly supervisionService = inject(SupervisionService);

  readonly loading = signal(false);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly operators = signal<OperatorLiveStatus[]>([]);
  readonly selectedOperatorId = signal<string | null>(null);
  readonly lastUpdated = signal<string>('');
  readonly error = signal<string | null>(null);

  /** Frecuencia de polling en segundos (30, 60, o 0 para desactivar). */
  readonly pollingSeconds = signal<number>(30);

  /** Operadores filtrados o seleccionados para atención urgente. */
  readonly criticalExceptions = computed(() => {
    return this.summary()?.exceptions ?? [];
  });

  private pollingSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.refresh();
    this.setupPolling(this.pollingSeconds());
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  /**
   * Ejecuta el refresco de métricas y estados en vivo.
   */
  refresh(): void {
    this.loading.set(true);
    this.error.set(null);

    this.supervisionService.getTableroResumen().subscribe({
      next: (sum) => {
        this.summary.set(sum);
        this.updateTimestamp();
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el resumen del tablero.');
        this.loading.set(false);
      },
    });

    this.supervisionService.getOperadoresEstado().subscribe({
      next: (ops) => {
        this.operators.set(ops);
      },
      error: () => {
        this.error.set('No se pudo actualizar el estado de los operadores.');
      },
    });
  }

  /**
   * Cambia la frecuencia del polling automático.
   */
  onPollingChange(seconds: number): void {
    this.pollingSeconds.set(seconds);
    this.setupPolling(seconds);
  }

  selectOperator(op: OperatorLiveStatus): void {
    this.selectedOperatorId.set(op.operatorId === this.selectedOperatorId() ? null : op.operatorId);
  }

  private setupPolling(seconds: number): void {
    this.stopPolling();
    if (seconds > 0) {
      this.pollingSubscription = interval(seconds * 1000).subscribe(() => {
        this.refresh();
      });
    }
  }

  private stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  private updateTimestamp(): void {
    const now = new Date();
    this.lastUpdated.set(now.toLocaleTimeString());
  }
}
