import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import type { HealthResult } from '../../core/models/health.model';
import { AuthService } from '../../core/services/auth.service';
import { HealthService } from '../../core/services/health.service';
import { environment } from '../../environments/environment';

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
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly healthService = inject(HealthService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly apiUrl = environment.apiUrl;
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
