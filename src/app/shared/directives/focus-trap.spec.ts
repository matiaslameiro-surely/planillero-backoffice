import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { FocusTrap } from './focus-trap';

/**
 * Anfitrión mínimo: un botón que abre el modal —el que después tiene que recuperar el foco— y un
 * modal con dos enfocables, que es lo mínimo para ver el ciclo de Tab.
 */
@Component({
  imports: [FocusTrap],
  template: `
    <button type="button" id="abrir" (click)="abierto.set(true)">Abrir</button>
    @if (abierto()) {
      <div appFocusTrap role="dialog" aria-modal="true" (escape)="abierto.set(false)">
        <button type="button" id="primero">Primero</button>
        <button type="button" id="ultimo">Último</button>
      </div>
    }
  `,
})
class Anfitrion {
  readonly abierto = signal(false);
}

describe('FocusTrap', () => {
  let fixture: ComponentFixture<Anfitrion>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Anfitrion] });
    fixture = TestBed.createComponent(Anfitrion);
    // El fixture tiene que estar en el documento: si no, nada recibe foco y `activeElement` no se
    // mueve del body.
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  function boton(id: string): HTMLButtonElement {
    return fixture.nativeElement.querySelector(`#${id}`);
  }

  function modal(): HTMLElement {
    return fixture.nativeElement.querySelector('[role="dialog"]');
  }

  function abrir(): void {
    boton('abrir').focus();
    boton('abrir').click();
    fixture.detectChanges();
  }

  it('lleva el foco al primer enfocable del modal al abrirse', () => {
    abrir();

    expect(document.activeElement).toBe(boton('primero'));
  });

  it('el contenedor es enfocable para poder recibir el foco inicial', () => {
    abrir();

    expect(modal().getAttribute('tabindex')).toBe('-1');
  });

  it('emite escape en vez de cerrar por su cuenta', () => {
    abrir();
    modal().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.abierto()).toBe(false);
  });

  it('Tab desde el último enfocable vuelve al primero', () => {
    abrir();
    boton('ultimo').focus();
    modal().dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

    expect(document.activeElement).toBe(boton('primero'));
  });

  it('Shift+Tab desde el primer enfocable salta al último', () => {
    abrir();
    boton('primero').focus();
    modal().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
    );

    expect(document.activeElement).toBe(boton('ultimo'));
  });

  it('devuelve el foco al elemento que lo abrio cuando se cierra', () => {
    abrir();
    fixture.componentInstance.abierto.set(false);
    fixture.detectChanges();

    expect(document.activeElement).toBe(boton('abrir'));
  });
});
