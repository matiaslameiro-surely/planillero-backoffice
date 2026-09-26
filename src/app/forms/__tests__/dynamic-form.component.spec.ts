import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DynamicFormComponent } from '../dynamic-form.component';
import { ValidationService } from '../validation.service';
import type { JsonSchema } from '../types';

describe('DynamicFormComponent (PLAN-59)', () => {
  let fixture: ComponentFixture<DynamicFormComponent>;
  let component: DynamicFormComponent;
  let validationService: ValidationService;

  const mockSchema: JsonSchema = {
    type: 'object',
    properties: {
      observaciones: {
        type: 'string',
        title: 'Observaciones',
        minLength: 5,
      },
    },
    required: ['observaciones'],
  } as JsonSchema;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DynamicFormComponent],
      providers: [ValidationService],
    });

    fixture = TestBed.createComponent(DynamicFormComponent);
    component = fixture.componentInstance;
    validationService = TestBed.inject(ValidationService);
  });

  it('en modo readonly, al disparar blur desde el template no ejecuta validaciones de campo ni muta señales de error, y no existe botón de envío', () => {
    fixture.componentRef.setInput('schema', mockSchema);
    fixture.componentRef.setInput('initialValues', { observaciones: 'abc' });
    fixture.componentRef.setInput('mode', 'readonly');
    fixture.detectChanges();

    const validateFieldSpy = vi.spyOn(validationService, 'validateField');
    const validateSpy = vi.spyOn(validationService, 'validate');

    // Buscamos el componente de campo texto en el DOM
    const fieldTextDebugElement = fixture.debugElement.query((debugEl) => debugEl.name === 'app-field-text');
    expect(fieldTextDebugElement).toBeTruthy();
    
    // Disparamos el evento blurEvent emitido por el componente app-field-text
    fieldTextDebugElement.triggerEventHandler('blurEvent', undefined);
    
    expect(validateFieldSpy).not.toHaveBeenCalled();
    expect(validateSpy).not.toHaveBeenCalled();
    
    const touched = (component as unknown as { touched: () => Record<string, boolean> }).touched();
    const errors = (component as unknown as { errors: () => Record<string, string> }).errors();

    expect(touched['observaciones']).toBeUndefined();
    expect(errors['observaciones']).toBeUndefined();

    // Verificar que no hay botón de envío
    const submitBtn = fixture.debugElement.query((debugEl) => debugEl.name === 'button' && debugEl.classes['btn-submit']);
    expect(submitBtn).toBeNull();
  });

  it('en modo edit, onBlur() valida el campo y marca el campo como tocado', () => {
    fixture.componentRef.setInput('schema', mockSchema);
    fixture.componentRef.setInput('initialValues', { observaciones: 'abc' });
    fixture.componentRef.setInput('mode', 'edit');
    fixture.detectChanges();

    const validateFieldSpy = vi.spyOn(validationService, 'validateField');

    (component as unknown as { onBlur: (name: string) => void }).onBlur('observaciones');

    expect(validateFieldSpy).toHaveBeenCalledWith(mockSchema, 'observaciones', 'abc');
    const touched = (component as unknown as { touched: () => Record<string, boolean> }).touched();
    const errors = (component as unknown as { errors: () => Record<string, string> }).errors();

    expect(touched['observaciones']).toBe(true);
    expect(errors['observaciones']).toContain('debe tener al menos 5 caracteres');
  });
});
