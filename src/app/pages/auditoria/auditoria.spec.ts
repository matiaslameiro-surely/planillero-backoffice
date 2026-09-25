import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuditLogEntry, AuditLogPage } from '../../core/models/audit.model';
import { AuditService } from '../../core/services/audit.service';
import { Auditoria } from './auditoria';

/**
 * Tests de la pantalla de auditoría.
 *
 * El servicio se reemplaza por un stub con respuestas síncronas, mismo enfoque que
 * `planificacion.spec.ts`.
 */
describe('Auditoria', () => {
  const entry: AuditLogEntry = {
    id: 'log-1',
    eventType: 'VISIT_STARTED',
    entityType: 'VISIT',
    entityId: 'a0000001-0000-4000-8000-000000000001',
    entityCode: null,
    username: 'operador.demo',
    ip: '127.0.0.1',
    deviceId: null,
    payload: '{"method":"start"}',
    createdAt: '2026-11-10T15:00:00Z',
  };

  const page: AuditLogPage = { content: [entry], totalElements: 1, totalPages: 1, number: 0, size: 20 };

  let fixture: ComponentFixture<Auditoria>;
  let service: AuditService;

  beforeEach(() => {
    service = {
      getLogs: vi.fn(() => of(page)),
      verify: vi.fn(() => of({ intacta: true, primerEslabonRotoId: null, motivo: null })),
    } as unknown as AuditService;

    TestBed.configureTestingModule({
      imports: [Auditoria],
      providers: [{ provide: AuditService, useValue: service }, provideRouter([])],
    });
  });

  function create(): void {
    fixture = TestBed.createComponent(Auditoria);
    fixture.detectChanges();
  }

  it('carga los eventos de auditoría al abrir', () => {
    create();

    expect(vi.mocked(service.getLogs)).toHaveBeenCalledTimes(1);
    const rows = fixture.nativeElement.querySelectorAll('.auditoria__table tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Visita iniciada');
    expect(rows[0].textContent).toContain('operador.demo');
  });

  it('refiltra al elegir un tipo de evento del selector', () => {
    create();

    const select: HTMLSelectElement = fixture.nativeElement.querySelector(
      'select[aria-label="Tipo de evento"]',
    );
    const codes = Array.from(select.options).map((option) => option.value);
    expect(codes).toEqual([
      '',
      'VISIT_ASSIGNED',
      'VISIT_STARTED',
      'FORM_SUBMITTED',
      'EVIDENCE_SAVED',
      'MANIFEST_SIGNED',
    ]);

    select.value = 'EVIDENCE_SAVED';
    select.dispatchEvent(new Event('change'));

    expect(vi.mocked(service.getLogs)).toHaveBeenLastCalledWith({
      eventType: 'EVIDENCE_SAVED',
      username: undefined,
      from: undefined,
      to: undefined,
      page: 0,
      size: 20,
    });
  });

  it('filtra por rango de fechas: desde el inicio del día hasta el fin del día', () => {
    create();

    const from: HTMLInputElement = fixture.nativeElement.querySelector('input[aria-label="Fecha desde"]');
    from.value = '2026-11-01';
    from.dispatchEvent(new Event('change'));
    const to: HTMLInputElement = fixture.nativeElement.querySelector('input[aria-label="Fecha hasta"]');
    to.value = '2026-11-10';
    to.dispatchEvent(new Event('change'));

    const filters = vi.mocked(service.getLogs).mock.lastCall?.[0];
    expect(filters?.from).toBe(new Date(2026, 10, 1).toISOString());
    expect(filters?.to).toBe(new Date(2026, 10, 10, 23, 59, 59, 999).toISOString());
  });

  it('pagina hacia adelante y hacia atrás, y vuelve a la primera página al cambiar un filtro', () => {
    vi.mocked(service.getLogs).mockReturnValue(
      of({ ...page, totalElements: 45, totalPages: 3 }),
    );
    create();

    const buttons = (): HTMLButtonElement[] =>
      Array.from(fixture.nativeElement.querySelectorAll('.auditoria__pager button'));
    expect(fixture.nativeElement.querySelector('.auditoria__pager-status').textContent).toContain(
      'Página 1 de 3',
    );
    expect(buttons()[0].disabled).toBe(true);

    buttons()[1].click();
    fixture.detectChanges();
    expect(vi.mocked(service.getLogs).mock.lastCall?.[0]?.page).toBe(1);

    buttons()[1].click();
    fixture.detectChanges();
    expect(vi.mocked(service.getLogs).mock.lastCall?.[0]?.page).toBe(2);
    expect(buttons()[1].disabled).toBe(true);

    buttons()[0].click();
    fixture.detectChanges();
    expect(vi.mocked(service.getLogs).mock.lastCall?.[0]?.page).toBe(1);

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[aria-label="Usuario"]');
    input.value = 'operador.demo';
    input.dispatchEvent(new Event('change'));
    expect(vi.mocked(service.getLogs).mock.lastCall?.[0]?.page).toBe(0);
  });

  it('muestra el evento como badge semántico con tooltip explicativo', () => {
    create();

    const badge: HTMLElement = fixture.nativeElement.querySelector('.auditoria__badge');
    expect(badge.textContent).toContain('Visita iniciada');
    expect(badge.classList).toContain('auditoria__badge--success');
    expect(badge.title).toContain('inició la visita');
    expect(fixture.nativeElement.querySelector('td span[title]').title.length).toBeGreaterThan(0);
  });

  it('muestra la fecha formateada, la entidad traducida y el código crudo sólo en tooltips', () => {
    create();

    const cells: NodeListOf<HTMLTableCellElement> = fixture.nativeElement.querySelectorAll('tbody td');
    // Mismo instante que `entry.createdAt`, en la zona horaria de quien corre el test.
    const local = new Date(entry.createdAt);
    const pad = (n: number) => String(n).padStart(2, '0');
    const expected =
      `${pad(local.getDate())}/${pad(local.getMonth() + 1)}/${local.getFullYear()} ` +
      `${pad(local.getHours())}:${pad(local.getMinutes())}`;
    expect(cells[0].textContent?.trim()).toBe(expected);

    expect(cells[1].textContent).not.toContain('VISIT_STARTED');
    const badge: HTMLElement = cells[1].querySelector('.auditoria__badge')!;
    expect(badge.title).toContain('VISIT_STARTED');

    expect(cells[2].textContent).toContain('Visita');
    expect(cells[2].textContent).not.toContain(entry.entityId);
    const id: HTMLElement = cells[2].querySelector('code')!;
    expect(id.textContent).toBe('a0000001…');
    expect(id.title).toBe(entry.entityId);

    const options: NodeListOf<HTMLOptionElement> = fixture.nativeElement.querySelectorAll('select option');
    options.forEach((option) => expect(option.textContent).not.toMatch(/\([A-Z_]+\)/));
  });

  it('muestra un código de evento desconocido sin romper la grilla', () => {
    vi.mocked(service.getLogs).mockReturnValue(
      of({ ...page, content: [{ ...entry, eventType: 'NUEVO_EVENTO' }] }),
    );
    create();

    const badge: HTMLElement = fixture.nativeElement.querySelector('.auditoria__badge');
    expect(badge.textContent).toContain('NUEVO_EVENTO');
    expect(badge.classList).toContain('auditoria__badge--neutral');
  });

  it('audita la cadena completa cuando el campo de visita está vacío', () => {
    create();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.auditoria__primary');
    button.click();
    fixture.detectChanges();

    expect(vi.mocked(service.verify)).toHaveBeenCalledWith(undefined);
    expect(fixture.nativeElement.querySelector('.auditoria__verify-result--ok').textContent).toContain(
      'Cadena íntegra',
    );
  });

  it('audita una visita puntual y muestra una cadena rota', () => {
    vi.mocked(service.verify).mockReturnValue(
      of({ intacta: false, primerEslabonRotoId: 'log-9', motivo: 'El hash no coincide.' }),
    );
    create();

    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[aria-label="ID o código de visita a auditar"]',
    );
    input.value = 'a0000001-0000-4000-8000-000000000001';
    input.dispatchEvent(new Event('input'));

    fixture.nativeElement.querySelector('.auditoria__primary').click();
    fixture.detectChanges();

    expect(vi.mocked(service.verify)).toHaveBeenCalledWith('a0000001-0000-4000-8000-000000000001');
    const result = fixture.nativeElement.querySelector('.auditoria__verify-result--broken');
    expect(result.textContent).toContain('log-9');
    expect(result.textContent).toContain('El hash no coincide.');
  });

  // --- PLAN-46 ---

  it('identifica la visita por su código y ofrece copiar el UUID completo', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    vi.mocked(service.getLogs).mockReturnValue(
      of({ ...page, content: [{ ...entry, entityCode: 'V-1001' }] }),
    );
    create();

    const cell: HTMLTableCellElement = fixture.nativeElement.querySelectorAll('tbody td')[2];
    const code: HTMLElement = cell.querySelector('code')!;
    expect(cell.textContent).toContain('Visita');
    expect(code.textContent).toBe('V-1001');
    expect(code.title).toBe(entry.entityId);

    (cell.querySelector('.auditoria__copy') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledWith(entry.entityId);
    expect((cell.querySelector('.auditoria__copy') as HTMLButtonElement).title).toBe('ID copiado');
  });

  describe('confirmación de copiado', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn(() => Promise.resolve()) },
        configurable: true,
      });
    });

    afterEach(() => vi.useRealTimers());

    const copyButton = (): HTMLButtonElement =>
      fixture.nativeElement.querySelector('.auditoria__copy') as HTMLButtonElement;

    async function copy(): Promise<void> {
      copyButton().click();
      // Resuelve la promesa de writeText sin adelantar el plazo de la tilde.
      await vi.advanceTimersByTimeAsync(0);
      fixture.detectChanges();
    }

    it('se borra sola a los 2 segundos', async () => {
      create();

      await copy();
      expect(copyButton().title).toBe('ID copiado');

      vi.advanceTimersByTime(1999);
      fixture.detectChanges();
      expect(copyButton().title).toBe('ID copiado');

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(copyButton().title).toBe('Copiar el ID completo');
    });

    it('volver a copiar reinicia el plazo', async () => {
      create();

      await copy();
      vi.advanceTimersByTime(1500);
      await copy();
      vi.advanceTimersByTime(1500);
      fixture.detectChanges();
      expect(copyButton().title).toBe('ID copiado');

      vi.advanceTimersByTime(500);
      fixture.detectChanges();
      expect(copyButton().title).toBe('Copiar el ID completo');
    });

    it('se borra al recargar la grilla', async () => {
      create();

      await copy();
      const select: HTMLSelectElement = fixture.nativeElement.querySelector(
        'select[aria-label="Tipo de evento"]',
      );
      select.value = 'VISIT_STARTED';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(copyButton().title).toBe('Copiar el ID completo');
    });
  });

  function verifyWith(value: string): void {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[aria-label="ID o código de visita a auditar"]',
    );
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.nativeElement.querySelector('.auditoria__primary').click();
    fixture.detectChanges();
  }

  it('audita una visita por su código', () => {
    create();

    verifyWith('V-1001');

    expect(vi.mocked(service.verify)).toHaveBeenCalledWith('V-1001');
    expect(fixture.nativeElement.querySelector('.auditoria__verify-result--ok')).not.toBeNull();
  });

  it('acepta códigos de varios segmentos, como los que no empiezan con V', () => {
    create();

    verifyWith('T-AUDIT-1');

    expect(vi.mocked(service.verify)).toHaveBeenCalledWith('T-AUDIT-1');
  });

  it('no llama al backend si el valor no es un ID ni un código de visita', () => {
    create();

    verifyWith('66');

    expect(vi.mocked(service.verify)).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.auditoria__verify [role="alert"]').textContent).toContain(
      'Ingresá un ID o un código de visita válido',
    );
  });

  it('muestra el mensaje del backend cuando la visita no existe', () => {
    vi.mocked(service.verify).mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            error: { error: 'visit_not_found', message: 'No existe una visita con ese ID o código.' },
          }),
      ),
    );
    create();

    verifyWith('V-9999');

    expect(fixture.nativeElement.querySelector('.auditoria__verify [role="alert"]').textContent).toContain(
      'No existe una visita con ese ID o código.',
    );
  });

  it('el filtro de usuario tiene un placeholder descriptivo, no un usuario', () => {
    create();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[aria-label="Usuario"]');
    expect(input.placeholder).toBe('Filtrar por usuario');
    expect(input.value).toBe('');
  });

  it('muestra un error si la carga de eventos falla', () => {
    vi.mocked(service.getLogs).mockReturnValue(throwError(() => new Error('caída')));
    create();

    expect(fixture.nativeElement.querySelector('.auditoria__feedback--error').textContent).toContain(
      'caída',
    );
  });
});
