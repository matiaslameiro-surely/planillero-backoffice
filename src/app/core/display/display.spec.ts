import { describe, expect, it } from 'vitest';

import {
  APP_DATE_FORMAT,
  AppDatePipe,
  AppDayPipe,
  formatAppDate,
  formatAppDay,
  LabelPipe,
  shortId,
  ShortIdPipe,
} from './display.pipes';
import { labelFor } from './labels';

describe('labelFor', () => {
  it('traduce los códigos de cada tipo que manda el backend', () => {
    expect(labelFor('visitStatus', 'IN_PROGRESS')).toBe('En curso');
    expect(labelFor('visitStatus', 'CANCELLED')).toBe('Cancelada');
    expect(labelFor('visitUrgency', 'HIGH')).toBe('Alta');
    expect(labelFor('shiftStatus', 'TURNO_COMPLETO')).toBe('Turno completo');
    expect(labelFor('exceptionType', 'OUT_OF_SLA')).toBe('Fuera de SLA');
    expect(labelFor('networkStatus', 'ONLINE')).toBe('En línea');
    expect(labelFor('evidenceType', 'SIGNATURE')).toBe('Firma');
    expect(labelFor('verificationStatus', 'TAMPERED')).toBe('Adulterado');
    expect(labelFor('evidenceIntegrity', 'MISSING_FILE')).toBe('Falta el archivo');
    expect(labelFor('entityType', 'VISIT')).toBe('Visita');
  });

  it('devuelve el código tal cual si no lo conoce, en vez de dejar un hueco', () => {
    expect(labelFor('visitStatus', 'ARCHIVED')).toBe('ARCHIVED');
  });

  it('devuelve vacío si no hay código', () => {
    expect(labelFor('visitStatus', null)).toBe('');
    expect(labelFor('visitStatus', undefined)).toBe('');
  });

  it('se expone a los templates con el pipe label', () => {
    expect(new LabelPipe().transform('LOW', 'visitUrgency')).toBe('Baja');
  });
});

describe('shortId', () => {
  const hash = '3f9a1c0b7d2e4f6a8b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a';

  it('abrevia un hash o un UUID largo', () => {
    expect(shortId(hash)).toBe('3f9a1c0b…');
    expect(new ShortIdPipe().transform(hash, 16)).toBe('3f9a1c0b7d2e4f6a…');
  });

  it('deja igual un valor que ya es corto', () => {
    expect(shortId('abc')).toBe('abc');
  });

  it('devuelve vacío si no hay valor', () => {
    expect(shortId(null)).toBe('');
  });
});

describe('formatAppDate', () => {
  it('usa el formato único dd/MM/yyyy HH:mm', () => {
    expect(APP_DATE_FORMAT).toBe('dd/MM/yyyy HH:mm');
    // La hora depende de la zona del navegador: se arma la fecha en hora local para que el test
    // no dependa de dónde corre.
    const local = new Date(2026, 10, 10, 9, 5);
    expect(formatAppDate(local)).toBe('10/11/2026 09:05');
    expect(new AppDatePipe().transform(local.toISOString())).toBe('10/11/2026 09:05');
  });

  it('devuelve vacío si no hay fecha', () => {
    expect(formatAppDate(null)).toBe('');
    expect(formatAppDate('')).toBe('');
  });
});

describe('formatAppDay', () => {
  it('muestra una fecha sin hora como dd/MM/yyyy, sin correrla un día por la zona horaria', () => {
    expect(formatAppDay('2026-09-23')).toBe('23/09/2026');
    expect(new AppDayPipe().transform('2026-01-01')).toBe('01/01/2026');
  });

  it('devuelve vacío si no hay fecha', () => {
    expect(formatAppDay(undefined)).toBe('');
  });
});
