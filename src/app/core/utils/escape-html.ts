/**
 * Escapa caracteres especiales de HTML (&, <, >, ", ') para prevenir inyecciones
 * de HTML y ataques XSS al interpolar valores dinámicos en cadenas HTML crudas
 * (por ejemplo, popups de Leaflet).
 */
export function escapeHtml(value: string | null | undefined): string {
  if (value == null) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
