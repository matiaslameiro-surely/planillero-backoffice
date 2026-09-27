import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  type GuardResult,
  provideRouter,
  Router,
  type RouterStateSnapshot,
} from '@angular/router';
import { of, type Observable } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import type { SessionUser } from '../../models/auth.model';
import { AuthService } from '../../services/auth.service';
import { supervisorGuard } from '../supervisor.guard';

/**
 * Tests de la guarda de supervisores.
 *
 * Se reemplaza el `AuthService` por un stub que decide qué usuario devuelve `ensureSession`, para
 * poder probar los tres caminos (sin sesión, con sesión y sin rol, con rol) sin levantar la cadena
 * de auth completa.
 */
describe('supervisorGuard', () => {
  const userBase: SessionUser = { username: 'supervisor.demo', roles: ['SUPERVISOR'], twoFactorEnabled: false };

  function runGuard(user: SessionUser | null): GuardResult | undefined {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { ensureSession: () => of(user), status: () => 'signedOut' } },
        provideRouter([]),
      ],
    });
    const result = TestBed.runInInjectionContext(() =>
      supervisorGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    if (result instanceof Promise) {
      throw new Error('La guarda devolvió una promesa; se esperaba un Observable.');
    }
    let resolved: GuardResult | undefined;
    (result as Observable<GuardResult>).subscribe((r) => (resolved = r));
    return resolved;
  }

  beforeEach(() => {
    // Para que `runGuard` no arrastre módulos de tests anteriores.
    TestBed.resetTestingModule();
  });

  it('manda al login cuando no hay sesión', () => {
    const result = runGuard(null);
    expect(result).toEqual(TestBed.inject(Router).createUrlTree(['/login']));
  });

  it('manda a acceso denegado cuando la sesión no tiene el rol SUPERVISOR', () => {
    const user: SessionUser = { ...userBase, roles: ['OPERATOR'] };
    const result = runGuard(user);
    expect(result).toEqual(TestBed.inject(Router).createUrlTree(['/acceso-denegado']));
  });

  it('deja pasar con el rol SUPERVISOR', () => {
    expect(runGuard(userBase)).toBe(true);
  });
});