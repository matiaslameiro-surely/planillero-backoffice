import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Navbar } from './core/components/navbar/navbar';
import { AuthService } from './core/services/auth.service';

/** Raíz de la aplicación con navegación global persistente para sesiones autenticadas. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly auth = inject(AuthService);
  protected readonly user = this.auth.user;
}
