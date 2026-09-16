import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

/** En qué paso del login está el usuario. */
type Step = 'credentials' | 'twoFactor';

/**
 * Pantalla de login.
 *
 * Contempla los dos pasos del backend: primero usuario y contraseña y, si la cuenta tiene 2FA, el
 * código TOTP. Los mensajes de error no distinguen si falló el usuario o la contraseña.
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly credentials = this.formBuilder.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  protected readonly twoFactor = this.formBuilder.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  protected readonly step = signal<Step>('credentials');
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  private challengeId: string | null = null;

  protected submitCredentials(): void {
    if (this.credentials.invalid) {
      this.credentials.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.submitting.set(true);
    const { username, password } = this.credentials.getRawValue();

    this.auth.login(username.trim(), password).subscribe({
      next: (result) => {
        if (result.twoFactorRequired) {
          this.challengeId = result.challengeId;
          this.step.set('twoFactor');
          this.submitting.set(false);
          return;
        }
        this.auth.startSession(result.tokens).subscribe({
          next: () => this.goHome(),
          error: (error: unknown) => this.fail(error),
        });
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  protected submitCode(): void {
    if (this.twoFactor.invalid || !this.challengeId) {
      this.twoFactor.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.submitting.set(true);
    const { code } = this.twoFactor.getRawValue();

    this.auth.verifyTwoFactor(this.challengeId, code).subscribe({
      next: () => this.goHome(),
      error: (error: unknown) => this.fail(error),
    });
  }

  private goHome(): void {
    void this.router.navigateByUrl('/');
  }

  private fail(error: unknown): void {
    this.submitting.set(false);
    this.error.set(messageOf(error));
  }
}

function messageOf(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: string } | null;
    return body?.message ?? `No se pudo completar la operación (${error.status}).`;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'No se pudo completar la operación.';
}
