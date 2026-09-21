import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../services/auth.service';

/**
 * Deja pasar sólo a administradores: exige sesión y el rol `ADMINISTRATOR`.
 *
 * Mismo patrón que `supervisor.guard.ts`. El backend además exige el rol en cada endpoint de
 * auditoría; esta guarda sólo evita mostrar la pantalla a quien no puede usarla.
 */
export const administratorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.ensureSession().pipe(
    map((user) => {
      if (!user) {
        return router.createUrlTree(['/login']);
      }
      if (!user.roles.includes('ADMINISTRATOR')) {
        return router.createUrlTree(['/acceso-denegado']);
      }
      return true;
    }),
  );
};
