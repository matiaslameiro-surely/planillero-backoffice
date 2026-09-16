import { Routes } from '@angular/router';

/**
 * Rutas de la aplicación.
 *
 * Cada feature nueva va en su carpeta bajo `pages/` y se registra acá con carga diferida, para que
 * su código no entre en el bundle inicial.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/inicio/inicio').then((m) => m.Inicio),
  },
  { path: '**', redirectTo: '' },
];
