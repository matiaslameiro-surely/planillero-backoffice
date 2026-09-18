import { Routes } from '@angular/router';

import { anonymousGuard } from './core/guards/anonymous.guard';
import { authenticatedGuard } from './core/guards/authenticated.guard';

/**
 * Rutas de la aplicación.
 *
 * Cada feature nueva va en su carpeta bajo `pages/` y se registra acá con carga diferida, para que
 * su código no entre en el bundle inicial. `login` es sólo para quien no tiene sesión; el resto,
 * para quien la tiene.
 */
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [anonymousGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'evidence/:visitId',
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./pages/evidence-viewer/evidence-viewer').then((m) => m.EvidenceViewer),
  },
  { path: '**', redirectTo: '' },
];
