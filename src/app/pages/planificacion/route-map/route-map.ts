import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import * as Leaflet from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import type { Visit } from '../../../core/models/planificacion.model';
import { escapeHtml } from '../../../core/utils/escape-html';

/**
 * Mapa de visitas sobre OpenStreetMap (Leaflet).
 *
 * Es la única pieza que toca Leaflet: la grilla, los filtros y la asignación de PLAN-8 son
 * componentes propios. Recibe las visitas ya filtradas por el padre y las pinta como marcadores;
 * el marcador por defecto de Leaflet no se resuelve bien bajo bundlers, así que se declaran las
 * imágenes empaquetadas.
 */
@Component({
  selector: 'app-route-map',
  templateUrl: './route-map.html',
  styleUrl: './route-map.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteMap implements AfterViewInit, OnChanges, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);

  /** Visitas a ubicar en el mapa. */
  @Input() visits: Visit[] = [];

  /** Cantidad de marcadores pintados, para el mensaje de vacío. */
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

  /** Levanta el mapa la primera vez que el canvas está en el DOM. */
  private init(): void {
    if (this.map) {
      return;
    }
    Leaflet.Icon.Default.mergeOptions({
      iconUrl: markerIcon,
      iconRetinaUrl: markerIcon2x,
      shadowUrl: markerShadow,
    });

    const canvas = this.host.nativeElement.querySelector('.route-map__canvas') as
      | HTMLElement
      | null;
    this.map = Leaflet.map(canvas ?? this.host.nativeElement).setView([-34.61, -58.38], 11);
    Leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);
    this.layer = Leaflet.layerGroup().addTo(this.map);
    this.render();
    // Lee el tamaño real del contenedor que acaba de entrar en la página.
    this.map.invalidateSize();
  }

  private render(): void {
    if (!this.layer || !this.map) {
      return;
    }
    this.layer.clearLayers();
    this.markerCount.set(0);
    const bounds = this.visits.map((visit) => Leaflet.latLng(visit.latitude, visit.longitude));
    for (const visit of this.visits) {
      Leaflet.marker(Leaflet.latLng(visit.latitude, visit.longitude))
        .bindPopup(`${escapeHtml(visit.code)} — ${escapeHtml(visit.urgency)} — ${escapeHtml(visit.address)}`)
        .addTo(this.layer);
    }
    this.markerCount.set(this.visits.length);
    if (bounds.length > 0) {
      this.map.fitBounds(Leaflet.latLngBounds(bounds));
    }
  }
}