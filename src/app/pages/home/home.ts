import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import type { HealthResult } from '../../core/models/health.model';
import { AuthService } from '../../core/services/auth.service';
import { HealthService } from '../../core/services/health.service';
import { apiOriginLabel } from '../../core/api-origin';

/** Lo que se está mostrando: la consulta en curso o su resultado. */
type HealthState = { kind: 'checking' } | { kind: 'settled'; result: HealthResult };

/**
 * Pantalla inicial del backoffice, protegida.
 *
 * Muestra quién está logueado y su rol, y conserva el diagnóstico de `/salud` del esqueleto: es el
 * primer lugar donde se ve si la configuración de entorno quedó bien.
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly healthService = inject(HealthService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  /**
   * Las secciones del backoffice son de supervisor y administrador. Un operador de campo sólo vería
   * «Secciones operativas» vacío, así que se le explica dónde trabaja (PLAN-64).
   */
  protected readonly hasBackofficeRole = computed(() => {
    const roles = this.user()?.roles ?? [];
    return roles.includes('SUPERVISOR') || roles.includes('ADMINISTRATOR');
  });
  protected readonly apiUrl = apiOriginLabel();
  protected readonly health = signal<HealthState>({ kind: 'checking' });

  constructor() {
    this.check();
  }

  protected check(): void {
    this.health.set({ kind: 'checking' });
    this.healthService.getHealth().subscribe((result) => {
      this.health.set({ kind: 'settled', result });
    });
  }

  protected signOut(): void {
    this.auth.logout().subscribe(() => void this.router.navigateByUrl('/login'));
  }
}
