import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { AppDatePipe, LabelPipe } from '../../core/display/display.pipes';
import { DynamicFormComponent } from '../../forms/dynamic-form.component';
import { ValidationService } from '../../forms/validation.service';
import { FormsApiService } from '../../forms/forms-api.service';
import { VisitsApiService } from '../../visits/visits-api.service';
import type { VisitWithForm, JsonSchema } from '../../forms/types';

@Component({
  selector: 'app-expediente',
  standalone: true,
  imports: [CommonModule, DynamicFormComponent, RouterLink, LabelPipe, AppDatePipe],
  template: `
    <div class="expediente-page">
      @if (loading) {
        <div class="loading">Cargando expediente...</div>
      } @else if (error) {
        <div class="error">{{ error }}</div>
      } @else if (visit) {
        <div class="expediente-container">
          <header class="expediente-header">
            <a routerLink="/planificacion" class="back-link">← Volver a planificación</a>
            <h1>Expediente: {{ visit.code }}</h1>
            <div class="visit-meta">
              <span class="status" [class]="getStatusClass()">{{ visit.status | label: 'visitStatus' }}</span>
              <span class="urgency">{{ visit.urgency | label: 'visitUrgency' }}</span>
            </div>
          </header>

          <div class="expediente-content-grid">
            <section class="visit-details">
              <h2>Detalles de la visita</h2>
              <dl>
                <dt>Código</dt><dd>{{ visit.code }}</dd>
                <dt>Dirección</dt><dd>{{ visit.address }}</dd>
                <dt>Coordenadas</dt><dd>{{ visit.latitude }}, {{ visit.longitude }}</dd>
                <dt>Jurisdicción</dt><dd>{{ visit.jurisdiction }}</dd>
                <dt>Estado</dt><dd>{{ visit.status | label: 'visitStatus' }}</dd>
                <dt>Urgencia</dt><dd>{{ visit.urgency | label: 'visitUrgency' }}</dd>
                <dt>Creada</dt><dd>{{ visit.createdAt | appDate }}</dd>
              </dl>
            </section>

            <div class="expediente-main-column">
              @if (formSchema && visit.responses) {
                <section class="form-section">
                  <h2>Formulario completado</h2>
                  <div class="form-readonly-note">Modo solo lectura - Expediente digital</div>
                  <app-dynamic-form
                    [schema]="formSchema"
                    [initialValues]="visit.responses"
                    mode="readonly"
                  />
                  @if (visit.submittedAt) {
                    <p class="submitted-at">Enviado: {{ visit.submittedAt | appDate }}</p>
                  }
                </section>
              } @else {
                <div class="no-form">Esta visita no tiene formulario cargado.</div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `.expediente-page { padding: 24px; width: 100%; max-width: 80rem; margin: 0 auto; box-sizing: border-box; }`,
    `.back-link { color: var(--color-primary); text-decoration: none; font-weight: 600; display: inline-block; margin-bottom: 8px; }`,
    `.back-link:hover { text-decoration: underline; }`,
    `.loading, .error { text-align: center; padding: 48px; font-size: 18px; }`,
    `.error { color: var(--color-error); }`,
    `.expediente-header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--color-border); }`,
    `.expediente-header h1 { margin: 0 0 8px; font-size: 28px; font-weight: 700; }`,
    `.visit-meta { display: flex; gap: 12px; flex-wrap: wrap; }`,
    `.status, .urgency { padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; }`,
    `.status.in_progress { background: var(--color-status-ok-bg); color: var(--color-status-ok); }`,
    `.status.completed { background: var(--color-status-pending-bg); color: var(--color-status-pending); }`,
    `.status.cancelled { background: var(--color-status-alert-bg); color: var(--color-status-alert); }`,
    `.status.assigned { background: var(--color-status-info-bg); color: var(--color-status-info); }`,
    `.urgency.high { background: var(--color-status-alert-bg); color: var(--color-status-alert); }`,
    `.urgency.medium { background: var(--color-status-pending-bg); color: var(--color-status-pending); }`,
    `.urgency.low { background: var(--color-status-ok-bg); color: var(--color-status-ok); }`,
    `.expediente-container { display: flex; flex-direction: column; gap: 24px; }`,
    `.expediente-content-grid { display: flex; flex-direction: column; gap: 24px; }`,
    `section h2 { font-size: 18px; font-weight: 600; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--color-border); }`,
    `.visit-details { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; padding: 20px; }`,
    `.visit-details dl { display: grid; grid-template-columns: 140px 1fr; gap: 8px 16px; margin: 0; font-size: 14px; }`,
    `.visit-details dt { color: var(--color-text-muted); font-weight: 500; }`,
    `.visit-details dd { margin: 0; color: var(--color-text); word-break: break-word; }`,
    `.form-section { background: var(--color-surface-muted); border-radius: 12px; padding: 20px; }`,
    `.form-readonly-note { font-size: 13px; color: var(--color-text-muted); margin-bottom: 16px; font-style: italic; }`,
    `.submitted-at { margin-top: 12px; font-size: 13px; color: var(--color-text-muted); }`,
    `.no-form { text-align: center; padding: 32px; color: var(--color-text-muted); background: var(--color-surface-muted); border-radius: 12px; border: 1px dashed var(--color-border-strong); }`,
    `@media (min-width: 1024px) { .expediente-content-grid { display: grid; grid-template-columns: 360px 1fr; gap: 24px; align-items: start; } .visit-details { position: sticky; top: 20px; } }`,
    `@media (min-width: 1440px) { .expediente-page { max-width: 90rem; } .expediente-content-grid { grid-template-columns: 400px 1fr; } }`,
    `@media (min-width: 1920px) { .expediente-page { max-width: 100rem; } .expediente-content-grid { grid-template-columns: 440px 1fr; } }`,
  ]
})
export class ExpedienteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private formsApi = inject(FormsApiService);
  private visitsApi = inject(VisitsApiService);
  private validationService = inject(ValidationService);

  protected visit: VisitWithForm | null = null;
  protected formSchema: JsonSchema | null = null;
  protected loading = true;
  protected error: string | null = null;

  protected getStatusClass(): string {
    return this.visit?.status?.toLowerCase() ?? '';
  }

  ngOnInit(): void {
    const visitId = this.route.snapshot.paramMap.get('visitId');
    if (!visitId) {
      this.error = 'ID de visita no proporcionado';
      this.loading = false;
      return;
    }
    this.loadExpediente(visitId);
  }

  private async loadExpediente(visitId: string): Promise<void> {
    try {
      this.loading = true;
      this.visit = await firstValueFrom(this.visitsApi.getVisitWithForm(visitId));

      if (this.visit.templateKey) {
        const template = await firstValueFrom(
          this.formsApi.getTemplate(this.visit.templateKey, this.visit.templateVersion),
        );
        this.formSchema = template.schema;
      }

      this.loading = false;
    } catch (e) {
      this.error = 'No se pudo cargar el expediente';
      this.loading = false;
      console.error(e);
    }
  }
}