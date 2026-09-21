import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import type { VisitWithForm } from '../forms/types';

@Injectable({ providedIn: 'root' })
export class VisitsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1`;

  /** GET /api/v1/visitas/{id}/formulario - con datos de formulario */
  getVisitWithForm(id: string): Observable<VisitWithForm> {
    return this.http.get<VisitWithForm>(`${this.baseUrl}/visitas/${id}/formulario`);
  }
}