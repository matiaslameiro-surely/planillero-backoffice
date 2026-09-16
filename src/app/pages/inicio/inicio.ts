import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { SaludService } from '../../core/services/salud.service';
import { environment } from '../../environments/environment';
import type { ResultadoSalud } from '../../core/models/salud.model';

/** Lo que se está mostrando: la consulta en curso o su resultado. */
type Estado = { tipo: 'consultando' } | { tipo: 'resuelto'; resultado: ResultadoSalud };

/**
 * Pantalla inicial del backoffice.
 *
 * Además de dar la bienvenida, sirve de diagnóstico: muestra si la aplicación puede hablar con el
 * backend. En un esqueleto eso vale más que una pantalla linda, porque es el primer lugar donde se ve
 * si la configuración de entorno quedó bien.
 */
@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Inicio {
  private readonly saludService = inject(SaludService);

  protected readonly urlApi = environment.urlApi;
  protected readonly estado = signal<Estado>({ tipo: 'consultando' });

  constructor() {
    this.consultar();
  }

  protected consultar(): void {
    this.estado.set({ tipo: 'consultando' });
    this.saludService.obtenerSalud().subscribe((resultado) => {
      this.estado.set({ tipo: 'resuelto', resultado });
    });
  }
}
