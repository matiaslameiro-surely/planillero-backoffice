import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { apiErrorCode, visitAccessMessage } from './visit-access';

describe('visitAccessMessage', () => {
  const http = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error });

  it('un 403, sea por jurisdicción o por asignación, es «sin acceso»', () => {
    expect(visitAccessMessage(http(403, { error: 'outside_jurisdiction' }))).toBe('No tenés acceso a esta visita.');
    expect(visitAccessMessage(http(403, { error: 'visit_not_assigned' }))).toBe('No tenés acceso a esta visita.');
  });

  it('un 404 es «no existe»', () => {
    expect(visitAccessMessage(http(404, { error: 'visit_not_found' }))).toBe('La visita no existe.');
  });

  it('otros errores quedan para el mensaje genérico de cada pantalla', () => {
    expect(visitAccessMessage(http(500))).toBeNull();
    expect(visitAccessMessage(http(0))).toBeNull();
    expect(visitAccessMessage(new Error('caída'))).toBeNull();
  });
});

describe('apiErrorCode', () => {
  it('lee el código del cuerpo del backend', () => {
    expect(apiErrorCode(new HttpErrorResponse({ status: 404, error: { error: 'manifest_not_found' } }))).toBe(
      'manifest_not_found',
    );
  });

  it('sin cuerpo o sin código, no inventa uno', () => {
    expect(apiErrorCode(new HttpErrorResponse({ status: 404 }))).toBeNull();
    expect(apiErrorCode(new HttpErrorResponse({ status: 404, error: 'texto plano' }))).toBeNull();
    expect(apiErrorCode(new Error('x'))).toBeNull();
  });
});
