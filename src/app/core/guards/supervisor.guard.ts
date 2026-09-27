import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { redirectWithoutSession } from './session-redirect';

/**
 * Deja pasar sólo a supervisores: exige sesión y el rol `SUPERVISOR`.
 *
 * Sin sesión manda al login; con sesión pero sin rol, a la pantalla de acceso denegado. El backend
 * además valida el rol y la jurisdicción, pero la guarda evita mostrar la pantalla a quien no puede
 * usarla.
 */
export const supervisorGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.ensureSession().pipe(
    map((user) => {
      if (!user) {
        return redirectWithoutSession(auth, router, state.url);
      }
      if (!user.roles.includes('SUPERVISOR')) {
        return router.createUrlTree(['/acceso-denegado']);
      }
      return true;
    }),
  );
};