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
  readonly lastUpdatedTimestamp = signal<number | null>(null);
  readonly secondsSinceUpdate = signal<number>(0);
  readonly secondsUntilNextRefresh = signal<number | null>(null);
  readonly isStale = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  /** Frecuencia de polling en segundos (30, 60, o 0 para desactivar). */
  readonly pollingSeconds = signal<number>(30);

  /** Operadores filtrados o seleccionados para atención urgente. */
  readonly criticalExceptions = computed(() => {
    return this.summary()?.exceptions ?? [];
  });

  /** Tiempo transcurrido formateado en español relativo. */
  readonly relativeTimeSinceUpdate = computed(() => {
    if (!this.lastUpdatedTimestamp()) return '';
    const s = this.secondsSinceUpdate();
    if (s < 5) return 'hace unos segundos';
    if (s < 60) return `hace ${s}s`;
    const m = Math.floor(s / 60);
    return `hace ${m} min`;
  });

  private tickerSubscription: Subscription | null = null;

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

    let summaryDone = false;
    let operatorsDone = false;
    let anyError = false;

    const checkFinished = () => {
      if (summaryDone && operatorsDone) {
        this.loading.set(false);
        if (anyError) {
          this.isStale.set(true);
        } else {
          this.isStale.set(false);
          this.error.set(null);
          this.updateTimestamp();
          this.secondsSinceUpdate.set(0);
          if (this.pollingSeconds() > 0) {
            this.secondsUntilNextRefresh.set(this.pollingSeconds());
          }
        }
      }
    };

    this.supervisionService.getTableroResumen().subscribe({
      next: (sum) => {
        this.summary.set(sum);
        summaryDone = true;
        checkFinished();
      },
      error: () => {
        anyError = true;
        this.error.set('No se pudo cargar el resumen del tablero.');
        summaryDone = true;
        checkFinished();
      },
    });

    this.supervisionService.getOperadoresEstado().subscribe({
      next: (ops) => {
        this.operators.set(ops);
        operatorsDone = true;
        checkFinished();
      },
      error: () => {
        anyError = true;
        this.error.set('No se pudo actualizar el estado de los operadores.');
        operatorsDone = true;
        checkFinished();
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
    this.secondsUntilNextRefresh.set(seconds > 0 ? seconds : null);

    this.tickerSubscription = interval(1000).subscribe(() => {
      if (this.lastUpdatedTimestamp()) {
        this.secondsSinceUpdate.set(
          Math.floor((Date.now() - this.lastUpdatedTimestamp()!) / 1000),
        );
      }

      const currentPolling = this.pollingSeconds();
      if (currentPolling > 0) {
        const next = (this.secondsUntilNextRefresh() ?? currentPolling) - 1;
        if (next <= 0) {
          this.secondsUntilNextRefresh.set(currentPolling);
          this.refresh();
        } else {
          this.secondsUntilNextRefresh.set(next);
        }
      }
    });
  }

  private stopPolling(): void {
    if (this.tickerSubscription) {
      this.tickerSubscription.unsubscribe();
      this.tickerSubscription = null;
    }
  }

  private updateTimestamp(): void {
    const now = new Date();
    this.lastUpdatedTimestamp.set(now.getTime());
    this.lastUpdated.set(now.toLocaleTimeString());
  }
}
