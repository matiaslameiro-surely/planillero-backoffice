import { describe, expect, it } from 'vitest';

import { apiOriginLabel } from '../api-origin';

describe('apiOriginLabel', () => {
  it('devuelve la URL del backend cuando está configurada', () => {
    expect(apiOriginLabel('http://localhost:8080')).toBe('http://localhost:8080');
  });

  it('cae en el origen de la página cuando apiUrl es vacío (mismo origen, build de Docker)', () => {
    expect(apiOriginLabel('')).toBe(window.location.origin);
    expect(apiOriginLabel('')).not.toBe('');
  });

  it('usa el entorno cuando no se le pasa nada', () => {
    expect(apiOriginLabel()).not.toBe('');
  });
});
