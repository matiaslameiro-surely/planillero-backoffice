import { formatDate } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

import { LabelKind, labelFor } from './labels';

/**
 * Formato único de fecha y hora del backoffice. Es un patrón explícito y no depende del
 * `LOCALE_ID`: sin locale registrado, `short` o `medium` salen en formato de EE. UU.
 */
export const APP_DATE_FORMAT = 'dd/MM/yyyy HH:mm';

/** Formato único para las fechas sin hora (fecha operativa, fecha de una hoja de ruta). */
export const APP_DAY_FORMAT = 'dd/MM/yyyy';

/** Largo de un identificador o hash abreviado: alcanza para distinguirlos a simple vista. */
export const SHORT_ID_LENGTH = 8;

export function formatAppDate(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  return formatDate(value, APP_DATE_FORMAT, 'en-US');
}

/**
 * Una fecha sin hora como `2026-09-23`. Angular la interpreta en hora local (no en UTC), así que no
 * se corre un día hacia atrás en Argentina.
 */
export function formatAppDay(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return formatDate(value, APP_DAY_FORMAT, 'en-US');
}

export function shortId(value: string | null | undefined, length = SHORT_ID_LENGTH): string {
  if (!value) {
    return '';
  }
  return value.length > length ? `${value.slice(0, length)}…` : value;
}

/** `{{ visit.status | label: 'visitStatus' }}` → «En curso». */
@Pipe({ name: 'label' })
export class LabelPipe implements PipeTransform {
  transform(code: string | null | undefined, kind: LabelKind): string {
    return labelFor(kind, code);
  }
}

/** `{{ item.sha256Hash | shortId }}` → «3f9a1c0b…». El valor completo va en el `title`. */
@Pipe({ name: 'shortId' })
export class ShortIdPipe implements PipeTransform {
  transform(value: string | null | undefined, length = SHORT_ID_LENGTH): string {
    return shortId(value, length);
  }
}

/** `{{ log.createdAt | appDate }}` → «10/11/2026 12:00». */
@Pipe({ name: 'appDate' })
export class AppDatePipe implements PipeTransform {
  transform(value: string | number | Date | null | undefined): string {
    return formatAppDate(value);
  }
}

/** `{{ sheet.date | appDay }}` → «23/09/2026». */
@Pipe({ name: 'appDay' })
export class AppDayPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatAppDay(value);
  }
}
