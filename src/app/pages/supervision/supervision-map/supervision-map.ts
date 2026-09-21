import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  inject,
  signal,
} from '@angular/core';
import * as Leaflet from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import type { OperatorLiveStatus } from '../../../core/models/supervision.model';

/**
 * Mapa Operativo de Supervisión sobre OpenStreetMap (Leaflet).
 *
 * Renderiza la ubicación geográfica en tiempo real de los operadores,
 * sus estados operativos y visitas activas.
 */
@Component({
  selector: 'app-supervision-map',
  templateUrl: './supervision-map.html',
  styleUrl: './supervision-map.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupervisionMap implements AfterViewInit, OnChanges, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);

  @Input() operators: OperatorLiveStatus[] = [];
  @Input() selectedOperatorId: string | null = null;
  @Output() readonly operatorSelected = new EventEmitter<OperatorLiveStatus>();

  protected readonly markerCount = signal(0);

  private map: Leaflet.Map | null = null;
  private layer: Leaflet.LayerGroup | null = null;

  ngAfterViewInit(): void {
    this.init();
  }

  ngOnChanges(): void {
    if (this.map) {
      this.render();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
    this.layer = null;
  }

  private init(): void {
    if (this.map) {
      return;
    }

    Leaflet.Icon.Default.mergeOptions({
      iconUrl: markerIcon,
      iconRetinaUrl: markerIcon2x,
      shadowUrl: markerShadow,
    });

    const canvas = this.host.nativeElement.querySelector('.supervision-map__canvas') as HTMLElement | null;
    this.map = Leaflet.map(canvas ?? this.host.nativeElement).setView([-34.53, -58.47], 12);

    Leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.layer = Leaflet.layerGroup().addTo(this.map);
    this.render();
    this.map.invalidateSize();
  }

  private render(): void {
    if (!this.layer || !this.map) {
      return;
    }

    this.layer.clearLayers();
    this.markerCount.set(0);

    const bounds: Leaflet.LatLng[] = [];
    const validOperators = this.operators.filter(
      (op) => op.lastLatitude !== null && op.lastLongitude !== null
    );

    for (const op of validOperators) {
      const latLng = Leaflet.latLng(op.lastLatitude!, op.lastLongitude!);
      bounds.push(latLng);

      const statusLabel =
        op.status === 'EN_CAMPO'
          ? 'En campo'
          : op.status === 'DEMORADO'
          ? 'Demorado'
          : op.status === 'OFFLINE'
          ? 'Offline'
          : 'Turno completo';

      const batteryText = op.batteryLevel !== null ? `${Math.round(op.batteryLevel * 100)}%` : 'N/D';
      const visitText = op.activeVisitCode
        ? `<strong>Visita:</strong> ${op.activeVisitCode} (${op.activeVisitElapsedMinutes ?? 0}m en curso)`
        : '<em>Sin visita activa</em>';

      const popupContent = `
        <div class="supervision-popup">
          <div class="supervision-popup__header">
            <strong>${op.username}</strong> &bull; <span class="badge status-${op.status.toLowerCase()}">${statusLabel}</span>
          </div>
          <div class="supervision-popup__body">
            <div><strong>Batería:</strong> ${batteryText}</div>
            <div><strong>Conexión:</strong> ${op.networkStatus}</div>
            <div>${visitText}</div>
            ${op.observations ? `<div class="supervision-popup__obs">${op.observations}</div>` : ''}
          </div>
        </div>
      `;

      const marker = Leaflet.marker(latLng).bindPopup(popupContent).addTo(this.layer);
      marker.on('click', () => {
        this.operatorSelected.emit(op);
      });

      if (this.selectedOperatorId && op.operatorId === this.selectedOperatorId) {
        marker.openPopup();
      }
    }

    this.markerCount.set(validOperators.length);

    if (bounds.length > 0) {
      this.map.fitBounds(Leaflet.latLngBounds(bounds), { padding: [30, 30] });
    }
  }
}
