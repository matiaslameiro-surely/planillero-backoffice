import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import type { FormTemplateListItem, FormTemplateDetail } from '../forms/types';

@Injectable({ providedIn: 'root' })
export class FormsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1`;

  /** GET /api/v1/plantillas */
  getTemplates(): Observable<FormTemplateListItem[]> {
    return this.http.get<FormTemplateListItem[]>(`${this.baseUrl}/plantillas`);
  }

  /** GET /api/v1/plantillas/{clave} */
  getTemplate(clave: string, version?: number): Observable<FormTemplateDetail> {
    const params = version ? `?version=${version}` : '';
    return this.http.get<FormTemplateDetail>(`${this.baseUrl}/plantillas/${clave}${params}`);
  }
}