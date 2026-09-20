import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    expect(rows[0].textContent).toContain('VISIT_STARTED');
    expect(rows[0].textContent).toContain('operador.demo');
  });

  it('refiltra al cambiar el tipo de evento', () => {
    create();

    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[aria-label="Tipo de evento"]',
    );
    input.value = 'EVIDENCE_SAVED';
    input.dispatchEvent(new Event('change'));

    expect(vi.mocked(service.getLogs)).toHaveBeenLastCalledWith({
      eventType: 'EVIDENCE_SAVED',
      username: undefined,
    });
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
      'input[aria-label="ID de visita a auditar"]',
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

  it('muestra un error si la carga de eventos falla', () => {
    vi.mocked(service.getLogs).mockReturnValue(throwError(() => new Error('caída')));
    create();

    expect(fixture.nativeElement.querySelector('.auditoria__feedback--error').textContent).toContain(
      'caída',
    );
  });
});
