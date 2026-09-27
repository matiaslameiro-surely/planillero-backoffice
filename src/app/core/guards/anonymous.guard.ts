import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { SERVER_UNAVAILABLE_PATH } from './session-redirect';

/**
 * Deja pasar sólo sin sesión. Si ya hay una, manda al inicio.
 *
 * Si hay una sesión guardada pero el servidor no respondió, manda a la pantalla de «sin conexión»:
 * el login no serviría (el servidor está caído) y la sesión puede seguir siendo válida.
 */
export const anonymousGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.ensureSession().pipe(
    map((user) => {
      if (user) {
        return router.createUrlTree(['/']);
      }
      if (auth.status() === 'unreachable') {
        return router.createUrlTree([SERVER_UNAVAILABLE_PATH], { queryParams: { volver: '/' } });
      }
      return true;
    }),
  );
};
