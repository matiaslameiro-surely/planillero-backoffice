import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { safeReturnUrl } from '../../core/guards/session-redirect';
import { AuthService } from '../../core/services/auth.service';

/**
 * Pantalla de «sin conexión con el servidor».
 *
 * Las guardas mandan acá cuando hay una sesión guardada pero el servidor no respondió al
 * restaurarla. La sesión se conserva: al reintentar con el servidor de vuelta, se retoma la ruta
 * pedida (`?volver=`) sin iniciar sesión otra vez.
 */
@Component({
  selector: 'app-server-unavailable',
  templateUrl: './server-unavailable.html',
  styleUrl: './server-unavailable.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerUnavailable {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly retrying = signal(false);
  /** Se muestra después de un reintento que tampoco obtuvo respuesta. */
  protected readonly stillUnavailable = signal(false);

  protected retry(): void {
    if (this.retrying()) {
      return;
    }
    this.retrying.set(true);
    this.stillUnavailable.set(false);
    this.auth.ensureSession().subscribe((user) => {
      this.retrying.set(false);
      if (user) {
        void this.router.navigateByUrl(safeReturnUrl(this.route.snapshot.queryParamMap.get('volver')));
      } else if (this.auth.status() === 'unreachable') {
        this.stillUnavailable.set(true);
      } else {
        void this.router.navigateByUrl('/login');
      }
    });
  }
}
