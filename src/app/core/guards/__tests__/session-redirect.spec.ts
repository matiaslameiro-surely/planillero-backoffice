import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  type CanActivateFn,
  type GuardResult,
  provideRouter,
  Router,
  type RouterStateSnapshot,
} from '@angular/router';
import { of, type Observable } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService, type SessionStatus } from '../../services/auth.service';
import { administratorGuard } from '../administrator.guard';
import { anonymousGuard } from '../anonymous.guard';
import { authenticatedGuard } from '../authenticated.guard';
import { safeReturnUrl } from '../session-redirect';
import { supervisorGuard } from '../supervisor.guard';

/**
 * Guardas sin usuario (PLAN-71): si el servidor no respondió al restaurar la sesión, mandan a
 * «sin conexión» con la ruta pedida; si no hay sesión o fue rechazada, al login como siempre.
 */
describe('guardas sin sesión', () => {
  function runGuard(guard: CanActivateFn, status: SessionStatus, url = '/supervision'): GuardResult | undefined {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { ensureSession: () => of(null), status: () => status } },
        provideRouter([]),
      ],
    });
    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
    let resolved: GuardResult | undefined;
    (result as Observable<GuardResult>).subscribe((r) => (resolved = r));
    return resolved;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  const protectedGuards: [string, CanActivateFn][] = [
    ['authenticatedGuard', authenticatedGuard],
    ['supervisorGuard', supervisorGuard],
    ['administratorGuard', administratorGuard],
  ];

  for (const [name, guard] of protectedGuards) {
    it(`${name}: servidor sin respuesta → sin conexión con volver`, () => {
      const result = runGuard(guard, 'unreachable', '/supervision');
      expect(result).toEqual(
        TestBed.inject(Router).createUrlTree(['/sin-conexion'], { queryParams: { volver: '/supervision' } }),
      );
    });

    it(`${name}: sesión rechazada o inexistente → login`, () => {
      const result = runGuard(guard, 'signedOut');
      expect(result).toEqual(TestBed.inject(Router).createUrlTree(['/login']));
    });
  }

  it('anonymousGuard: servidor sin respuesta → sin conexión en lugar del login', () => {
    const result = runGuard(anonymousGuard, 'unreachable');
    expect(result).toEqual(
      TestBed.inject(Router).createUrlTree(['/sin-conexion'], { queryParams: { volver: '/' } }),
    );
  });

  it('anonymousGuard: sin sesión deja entrar al login', () => {
    expect(runGuard(anonymousGuard, 'signedOut')).toBe(true);
  });
});

describe('safeReturnUrl', () => {
  it('acepta rutas internas', () => {
    expect(safeReturnUrl('/expediente/abc?x=1')).toBe('/expediente/abc?x=1');
  });

  it('descarta URLs externas, vacías y la propia pantalla', () => {
    const invalid = [
      null,
      '',
      'https://sitio.example',
      '//sitio.example',
      '/\\sitio.example',
      '/sin-conexion',
      '/sin-conexion?volver=/',
    ];
    for (const url of invalid) {
      expect(safeReturnUrl(url)).toBe('/');
    }
  });
});
