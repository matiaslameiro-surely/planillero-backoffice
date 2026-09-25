import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import type { SessionUser } from '../../core/models/auth.model';
import { AuthService } from '../../core/services/auth.service';
import { HealthService } from '../../core/services/health.service';
import { Home } from './home';

/**
 * Inicio según el rol (PLAN-64): las secciones son de supervisor y administrador, y un operador de
 * campo ve un aviso en lugar de una lista vacía.
 */
describe('Home', () => {
  function render(roles: string[]): HTMLElement {
    const user = signal<SessionUser | null>({ username: 'usuario.ficticio', roles, twoFactorEnabled: false });
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { user, logout: () => of(undefined) } },
        { provide: HealthService, useValue: { getHealth: () => of({ status: 'connected', at: '' }) } },
      ],
    });
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('un operador ve el aviso y no la lista vacía de secciones', () => {
    const el = render(['OPERATOR']);

    expect(el.querySelector('.home__role-notice')?.textContent).toContain('operador de campo');
    expect(el.querySelector('.home__sections')).toBeNull();
  });

  it('un supervisor ve sus secciones y no el aviso', () => {
    const el = render(['SUPERVISOR']);

    expect(el.querySelector('.home__role-notice')).toBeNull();
    expect(el.querySelector('.home__sections')?.textContent).toContain('Planificación de rutas');
  });

  it('un administrador ve Auditoría', () => {
    const el = render(['ADMINISTRATOR']);

    expect(el.querySelector('.home__role-notice')).toBeNull();
    expect(el.querySelector('.home__sections')?.textContent).toContain('Auditoría');
  });
});
