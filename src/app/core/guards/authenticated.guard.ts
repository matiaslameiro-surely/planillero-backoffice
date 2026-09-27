import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { redirectWithoutSession } from './session-redirect';

/** Deja pasar sólo con sesión. Si no la hay, manda al login (o a «sin conexión» si el servidor no respondió). */
export const authenticatedGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth
    .ensureSession()
    .pipe(map((user) => (user ? true : redirectWithoutSession(auth, router, state.url))));
};
