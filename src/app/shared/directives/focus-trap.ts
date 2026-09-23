import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  output,
} from '@angular/core';

/** Selector de lo que el navegador considera enfocable dentro de un contenedor. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Convierte un contenedor en un modal navegable con el teclado.
 *
 * Hace las tres cosas que un `role="dialog"` necesita y que el navegador no da solo: le lleva el
 * foco al abrirse, mantiene el Tab dando vueltas adentro mientras está abierto y devuelve el foco
 * al elemento que lo abrió cuando desaparece. Escape no lo cierra por su cuenta: emite `escape` y
 * decide el componente, que es el único que sabe qué significa cerrar en su pantalla.
 *
 * Se aplica al elemento que tiene el `role="dialog"`, y ese elemento recibe `tabindex="-1"` para
 * poder ser foco inicial cuando adentro no hay nada enfocable todavía.
 */
@Directive({
  selector: '[appFocusTrap]',
  host: {
    tabindex: '-1',
    '(keydown)': 'onKeydown($event)',
  },
})
export class FocusTrap implements OnInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Se emitió Escape dentro del modal. Quién cierra, y cómo, es del componente anfitrión. */
  readonly escape = output<void>();

  /** Quién tenía el foco antes de abrirse, para devolvérselo al cerrar. */
  private previouslyFocused: HTMLElement | null = null;

  ngOnInit(): void {
    const active = document.activeElement;
    this.previouslyFocused = active instanceof HTMLElement ? active : null;

    // Con `data-focus-initial` el modal elige dónde entra el foco; sin él se usa el primer
    // enfocable, que es casi siempre el botón de cerrar o el de cancelar. Si no hay ninguno, el
    // foco queda en el contenedor, que por eso lleva tabindex="-1". Se usa un atributo propio y no
    // `autofocus`, que la regla de accesibilidad del lint prohíbe —con razón— para el foco que el
    // navegador roba solo al cargar la página; acá el foco se mueve al abrirse un modal, que es
    // justo lo contrario.
    const preferred = this.host.nativeElement.querySelector<HTMLElement>('[data-focus-initial]');
    const target = preferred ?? this.focusable()[0] ?? this.host.nativeElement;
    target.focus();
  }

  ngOnDestroy(): void {
    this.previouslyFocused?.focus();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.escape.emit();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }

    const items = this.focusable();
    if (items.length === 0) {
      // Sin nada enfocable adentro, dejar pasar el Tab mandaría el foco al fondo del modal.
      event.preventDefault();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === this.host.nativeElement)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /** Enfocables visibles del modal, en orden de documento. */
  private focusable(): HTMLElement[] {
    return Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((element) => !element.hasAttribute('hidden'));
  }
}
