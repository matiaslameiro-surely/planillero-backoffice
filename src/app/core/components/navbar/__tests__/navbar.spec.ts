import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionUser } from '../../../models/auth.model';
import { AuthService } from '../../../services/auth.service';
import { Navbar } from '../navbar';

describe('Navbar', () => {
  let fixture: ComponentFixture<Navbar>;
  let userSignal: ReturnType<typeof signal<SessionUser | null>>;
  let authMock: { user: typeof userSignal; logout: ReturnType<typeof vi.fn> };
  let router: Router;

  const supervisorUser: SessionUser = {
    username: 'supervisor.demo',
    roles: ['SUPERVISOR'],
    twoFactorEnabled: false,
  };

  const adminUser: SessionUser = {
    username: 'admin.demo',
    roles: ['ADMINISTRATOR'],
    twoFactorEnabled: false,
  };

  beforeEach(() => {
    userSignal = signal<SessionUser | null>(supervisorUser);
    authMock = {
      user: userSignal,
      logout: vi.fn(() => of(undefined)),
    };

    TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        { provide: AuthService, useValue: authMock },
        provideRouter([]),
      ],
    });

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockImplementation(() => Promise.resolve(true));

    fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
  });

  it('muestra la marca de Planillero Backoffice y el enlace al inicio', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.navbar__title')?.textContent).toContain('Planillero');
    expect(el.querySelector('.navbar__tag')?.textContent).toContain('Backoffice');

    const links = Array.from(el.querySelectorAll('.navbar__link')).map((a) => a.textContent?.trim());
    expect(links).toContain('Inicio');
  });

  it('muestra los enlaces de supervisión y planificación para el rol SUPERVISOR', () => {
    const el = fixture.nativeElement as HTMLElement;
    const links = Array.from(el.querySelectorAll('.navbar__link')).map((a) => a.textContent?.trim());

    expect(links).toContain('Supervisión');
    expect(links).toContain('Planificación');
    expect(links).not.toContain('Auditoría');
  });

  it('muestra el enlace de auditoría y oculta supervisión para el rol ADMINISTRATOR', () => {
    userSignal.set(adminUser);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const links = Array.from(el.querySelectorAll('.navbar__link')).map((a) => a.textContent?.trim());

    expect(links).toContain('Auditoría');
    expect(links).not.toContain('Supervisión');
    expect(links).not.toContain('Planificación');
  });

  it('muestra los datos del usuario en sesión', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.navbar__username')?.textContent).toContain('supervisor.demo');
    expect(el.querySelector('.navbar__role')?.textContent).toContain('SUPERVISOR');
  });

  it('ejecuta logout y redirige a /login al pulsar Cerrar sesión', () => {
    const btn = fixture.nativeElement.querySelector('.navbar__logout-btn') as HTMLButtonElement;
    btn.click();

    expect(authMock.logout).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
