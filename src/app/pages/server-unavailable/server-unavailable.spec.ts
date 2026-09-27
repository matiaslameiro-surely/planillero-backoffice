import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionUser } from '../../core/models/auth.model';
import { AuthService, type SessionStatus } from '../../core/services/auth.service';
import { ServerUnavailable } from './server-unavailable';

/**
 * Pantalla «sin conexión» (PLAN-71): al reintentar, retoma la ruta pedida si la sesión se restaura,
 * va al login si el backend la rechazó, y avisa si el servidor sigue sin responder.
 */
describe('ServerUnavailable', () => {
  const user: SessionUser = { username: 'supervisor.ficticio', roles: ['SUPERVISOR'], twoFactorEnabled: false };

  function render(result: SessionUser | null, statusAfter: SessionStatus, volver: string | null) {
    TestBed.configureTestingModule({
      imports: [ServerUnavailable],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { ensureSession: () => of(result), status: () => statusAfter },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(volver ? { volver } : {}) } },
        },
      ],
    });
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ServerUnavailable);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const clickRetry = () => {
      el.querySelector<HTMLButtonElement>('.unavailable__button')!.click();
      fixture.detectChanges();
    };
    return { el, navigate, clickRetry };
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('muestra el aviso y el botón Reintentar', () => {
    const { el } = render(null, 'unreachable', '/supervision');

    expect(el.querySelector('h1')?.textContent).toContain('Sin conexión con el servidor');
    expect(el.querySelector('.unavailable__button')?.textContent).toContain('Reintentar');
  });

  it('si la sesión se restaura, vuelve a la ruta pedida', () => {
    const { navigate, clickRetry } = render(user, 'signedIn', '/supervision');
    clickRetry();

    expect(navigate).toHaveBeenCalledWith('/supervision');
  });

  it('si el backend rechazó la sesión, va al login', () => {
    const { navigate, clickRetry } = render(null, 'signedOut', '/supervision');
    clickRetry();

    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('si el servidor sigue sin responder, lo avisa y no navega', () => {
    const { el, navigate, clickRetry } = render(null, 'unreachable', '/supervision');
    clickRetry();

    expect(navigate).not.toHaveBeenCalled();
    expect(el.querySelector('.unavailable__status')?.textContent).toContain('sigue sin responder');
  });

  it('ignora un volver externo y va al inicio', () => {
    const { navigate, clickRetry } = render(user, 'signedIn', '//sitio-externo.example');
    clickRetry();

    expect(navigate).toHaveBeenCalledWith('/');
  });
});
