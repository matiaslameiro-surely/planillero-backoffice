import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../services/auth.service';

/**
 * Barra de navegación superior persistente del backoffice.
 *
 * Expone la identidad de la aplicación, los accesos a las secciones según los roles del usuario
 * autenticado, el usuario en sesión y la acción de cerrar sesión.
 */
@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly isSupervisor = computed(
    () => this.user()?.roles.includes('SUPERVISOR') ?? false,
  );
  protected readonly isAdmin = computed(
    () => this.user()?.roles.includes('ADMINISTRATOR') ?? false,
  );

  protected signOut(): void {
    this.auth.logout().subscribe(() => void this.router.navigateByUrl('/login'));
  }
}
