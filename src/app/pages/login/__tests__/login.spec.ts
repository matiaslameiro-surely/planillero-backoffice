import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../core/services/auth.service';
import { Login } from '../login';

describe('Login (PLAN-73)', () => {
  let fixture: ComponentFixture<Login>;
  let authService: {
    login: ReturnType<typeof vi.fn>;
    startSession: ReturnType<typeof vi.fn>;
    verifyTwoFactor: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(() => {
    authService = {
      login: vi.fn(),
      startSession: vi.fn(),
      verifyTwoFactor: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    });

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
  });

  it('muestra mensaje amigable sin códigos técnicos ante error 502 (backend caído)', () => {
    authService.login.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 502, statusText: 'Bad Gateway' })),
    );

    const el = fixture.nativeElement as HTMLElement;
    const userInput = el.querySelector<HTMLInputElement>('#username')!;
    const passInput = el.querySelector<HTMLInputElement>('#password')!;
    userInput.value = 'operador.demo';
    userInput.dispatchEvent(new Event('input'));
    passInput.value = 'Secreto123!';
    passInput.dispatchEvent(new Event('input'));

    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const errorEl = el.querySelector('.login__error');
    expect(errorEl?.textContent).toBe('No se puede conectar con el servidor. Probá de nuevo en unos minutos.');
  });

  it('muestra mensaje amigable sin códigos técnicos ante error de red (status 0)', () => {
    authService.login.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' })),
    );

    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLInputElement>('#username')!.value = 'operador.demo';
    el.querySelector<HTMLInputElement>('#username')!.dispatchEvent(new Event('input'));
    el.querySelector<HTMLInputElement>('#password')!.value = 'Secreto123!';
    el.querySelector<HTMLInputElement>('#password')!.dispatchEvent(new Event('input'));

    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const errorEl = el.querySelector('.login__error');
    expect(errorEl?.textContent).toBe('No se puede conectar con el servidor. Probá de nuevo en unos minutos.');
  });

  it('muestra el mensaje del cuerpo cuando el backend devuelve un error con mensaje específico', () => {
    authService.login.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            error: { message: 'Credenciales inválidas' },
          }),
      ),
    );

    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLInputElement>('#username')!.value = 'operador.demo';
    el.querySelector<HTMLInputElement>('#username')!.dispatchEvent(new Event('input'));
    el.querySelector<HTMLInputElement>('#password')!.value = 'Secreto123!';
    el.querySelector<HTMLInputElement>('#password')!.dispatchEvent(new Event('input'));

    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const errorEl = el.querySelector('.login__error');
    expect(errorEl?.textContent).toBe('Credenciales inválidas');
  });

  it('muestra el código de error genérico cuando ocurre un error HTTP 400 sin cuerpo', () => {
    authService.login.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400 })),
    );

    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLInputElement>('#username')!.value = 'operador.demo';
    el.querySelector<HTMLInputElement>('#username')!.dispatchEvent(new Event('input'));
    el.querySelector<HTMLInputElement>('#password')!.value = 'Secreto123!';
    el.querySelector<HTMLInputElement>('#password')!.dispatchEvent(new Event('input'));

    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const errorEl = el.querySelector('.login__error');
    expect(errorEl?.textContent).toBe('No se pudo completar la operación (400).');
  });

  it('inicia sesión exitosamente y redirige al inicio', () => {
    authService.login.mockReturnValue(
      of({
        twoFactorRequired: false,
        tokens: { accessToken: 'token', refreshToken: 'refresh' },
      }),
    );
    authService.startSession.mockReturnValue(of(undefined));

    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLInputElement>('#username')!.value = 'operador.demo';
    el.querySelector<HTMLInputElement>('#username')!.dispatchEvent(new Event('input'));
    el.querySelector<HTMLInputElement>('#password')!.value = 'Secreto123!';
    el.querySelector<HTMLInputElement>('#password')!.dispatchEvent(new Event('input'));

    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(authService.login).toHaveBeenCalledWith('operador.demo', 'Secreto123!');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });
});
