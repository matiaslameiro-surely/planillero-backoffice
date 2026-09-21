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
import { administratorGuard } from '../administrator.guard';

/**
 * Tests de la guarda de administradores. Mismo enfoque que `supervisor.guard.spec.ts`.
 */
describe('administratorGuard', () => {
  const userBase: SessionUser = { username: 'admin.demo', roles: ['ADMINISTRATOR'], twoFactorEnabled: false };

  function runGuard(user: SessionUser | null): GuardResult | undefined {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { ensureSession: () => of(user) } },
        provideRouter([]),
      ],
    });
    const result = TestBed.runInInjectionContext(() =>
      administratorGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    if (result instanceof Promise) {
      throw new Error('La guarda devolvió una promesa; se esperaba un Observable.');
    }
    let resolved: GuardResult | undefined;
    (result as Observable<GuardResult>).subscribe((r) => (resolved = r));
    return resolved;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('manda al login cuando no hay sesión', () => {
    const result = runGuard(null);
    expect(result).toEqual(TestBed.inject(Router).createUrlTree(['/login']));
  });

  it('manda a acceso denegado cuando la sesión no tiene el rol ADMINISTRATOR', () => {
    const user: SessionUser = { ...userBase, roles: ['SUPERVISOR'] };
    const result = runGuard(user);
    expect(result).toEqual(TestBed.inject(Router).createUrlTree(['/acceso-denegado']));
  });

  it('deja pasar con el rol ADMINISTRATOR', () => {
    expect(runGuard(userBase)).toBe(true);
  });
});
