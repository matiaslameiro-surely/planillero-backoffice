import { Routes } from '@angular/router';

import { administratorGuard } from './core/guards/administrator.guard';
import { anonymousGuard } from './core/guards/anonymous.guard';
import { authenticatedGuard } from './core/guards/authenticated.guard';
import { supervisorGuard } from './core/guards/supervisor.guard';

/**
 * Rutas de la aplicación.
 *
 * Cada feature nueva va en su carpeta bajo `pages/` y se registra acá con carga diferida, para que
 * su código no entre en el bundle inicial. `login` es sólo para quien no tiene sesión; el resto,
 * para quien la tiene. La planificación es la única reservada a supervisores.
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
    path: 'planificacion',
    canActivate: [supervisorGuard],
    loadComponent: () => import('./pages/planificacion/planificacion').then((m) => m.Planificacion),
  },
  {
    path: 'supervision',
    canActivate: [supervisorGuard],
    loadComponent: () => import('./pages/supervision/supervision').then((m) => m.Supervision),
  },
  {
    path: 'auditoria',
    canActivate: [administratorGuard],
    loadComponent: () => import('./pages/auditoria/auditoria').then((m) => m.Auditoria),
  },
  {
    path: 'acceso-denegado',
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./pages/access-denied/access-denied').then((m) => m.AccessDenied),
  },
  {
    path: 'evidence/:visitId',
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./pages/evidence-viewer/evidence-viewer').then((m) => m.EvidenceViewer),
  },
  {
    path: 'expediente/:visitId',
    canActivate: [supervisorGuard],
    loadComponent: () =>
      import('./pages/expediente/expediente.component').then((m) => m.ExpedienteComponent),
  },
  { path: '**', redirectTo: '' },
];