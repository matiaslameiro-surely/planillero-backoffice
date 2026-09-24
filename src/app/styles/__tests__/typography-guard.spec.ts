import { describe, it, expect } from 'vitest';

interface NodeFs {
  existsSync(path: string): boolean;
  readdirSync(path: string, options: { withFileTypes: true }): { name: string; isDirectory(): boolean; isFile(): boolean }[];
  readFileSync(path: string, encoding: string): string;
}

interface NodePath {
  join(...paths: string[]): string;
  resolve(...paths: string[]): string;
  relative(from: string, to: string): string;
}

declare const require: (module: string) => NodeFs & NodePath;
declare const process: { cwd: () => string };

const fs: NodeFs = require('node:fs');
const path: NodePath = require('node:path');

export interface StyleViolation {
  file: string;
  line: number;
  type: 'font-size' | 'opacity';
  found: string;
  message: string;
}

const MIN_PX = 12;
const MIN_REM = 0.75;
const MIN_EM = 0.75;
const MIN_PT = 9;
const MIN_PERCENT = 75;

/**
 * Analiza un valor o fragmento CSS para detectar si font-size viola el piso tipográfico.
 *
 * Límites conocidos:
 * - No evalúa expresiones dinámicas complejas `calc(...)`.
 * - No desglosa el atajo taquigráfico `font: <size>/<line-height> <family>`.
 * - Escanea el archivo `.ts` completo; si se usa `opacity` en un objeto JavaScript (ej. Leaflet),
 *   se debe documentar con `// allow-opacity: <motivo>`.
 */
export function validateFontSize(val: string): { valid: boolean; reason?: string } {
  const trimmed = val.trim().replace(/;$/, '').replace(/!important$/, '').trim();

  // Variables y palabras clave válidas
  if (
    trimmed === '$font-size-min' ||
    trimmed === '$font-size-glance' ||
    trimmed === 'inherit' ||
    trimmed === 'initial' ||
    trimmed === 'unset' ||
    trimmed.startsWith('var(')
  ) {
    return { valid: true };
  }

  // Comprobar px
  const pxMatch = trimmed.match(/^([\d.]+)px$/);
  if (pxMatch) {
    const px = parseFloat(pxMatch[1]);
    if (px < MIN_PX) {
      return { valid: false, reason: `${trimmed} < ${MIN_PX}px` };
    }
    return { valid: true };
  }

  // Comprobar rem
  const remMatch = trimmed.match(/^([\d.]+)rem$/);
  if (remMatch) {
    const rem = parseFloat(remMatch[1]);
    if (rem < MIN_REM) {
      return { valid: false, reason: `${trimmed} < ${MIN_REM}rem ($font-size-min)` };
    }
    return { valid: true };
  }

  // Comprobar em
  const emMatch = trimmed.match(/^([\d.]+)em$/);
  if (emMatch) {
    const em = parseFloat(emMatch[1]);
    if (em < MIN_EM) {
      return { valid: false, reason: `${trimmed} < ${MIN_EM}em` };
    }
    return { valid: true };
  }

  // Comprobar pt
  const ptMatch = trimmed.match(/^([\d.]+)pt$/);
  if (ptMatch) {
    const pt = parseFloat(ptMatch[1]);
    if (pt < MIN_PT) {
      return { valid: false, reason: `${trimmed} < ${MIN_PT}pt (equivale a 12px)` };
    }
    return { valid: true };
  }

  // Comprobar %
  const pctMatch = trimmed.match(/^([\d.]+)%$/);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]);
    if (pct < MIN_PERCENT) {
      return { valid: false, reason: `${trimmed} < ${MIN_PERCENT}%` };
    }
    return { valid: true };
  }

  // Nombres estándar que son menores a 12px
  if (trimmed === 'xx-small') {
    return { valid: false, reason: `${trimmed} es inferior al piso de 12px` };
  }

  return { valid: true };
}

/**
 * Audita el contenido de un archivo de estilos o componente.
 */
export function auditStyleContent(content: string, filePath: string): StyleViolation[] {
  const violations: StyleViolation[] = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const trimmedLine = line.trim();

    // Ignorar comentarios puros de una sola línea
    if (trimmedLine.startsWith('//') || (trimmedLine.startsWith('/*') && trimmedLine.endsWith('*/') && !trimmedLine.includes('font-size') && !trimmedLine.includes('opacity'))) {
      continue;
    }

    // 1. Validar propiedades font-size estándar
    const fontSizePropRegex = /(?:^|[^\w$-])font-size\s*:\s*([^;!}\n]+)/gi;
    let match: RegExpExecArray | null;
    while ((match = fontSizePropRegex.exec(line)) !== null) {
      const rawVal = match[1];
      const check = validateFontSize(rawVal);
      if (!check.valid) {
        violations.push({
          file: filePath,
          line: lineNum,
          type: 'font-size',
          found: rawVal.trim(),
          message: `[${filePath}:${lineNum}] font-size '${rawVal.trim()}' viola el piso tipográfico: ${check.reason}. El mínimo permitido es $font-size-min (12px / 0.75rem).`,
        });
      }
    }

    // 2. Validar definiciones de tokens SCSS ($font-size-*: ...) y CSS custom properties (--font-size-*: ...)
    const tokenDefRegex = /(?:^|[^\w])(\$font-size[-\w]*|--font-size[-\w]*)\s*:\s*([^;!}\n]+)/gi;
    while ((match = tokenDefRegex.exec(line)) !== null) {
      const tokenName = match[1].trim();
      const rawVal = match[2];
      const check = validateFontSize(rawVal);
      if (!check.valid) {
        violations.push({
          file: filePath,
          line: lineNum,
          type: 'font-size',
          found: `${tokenName}: ${rawVal.trim()}`,
          message: `[${filePath}:${lineNum}] Definición de token '${tokenName}: ${rawVal.trim()}' viola el piso tipográfico: ${check.reason}. El mínimo permitido es $font-size-min (12px / 0.75rem).`,
        });
      }
    }

    // 3. Validar opacity
    const opacityRegex = /(?:^|[^\w$-])opacity\s*:\s*([^;!}\n]+)/gi;
    while ((match = opacityRegex.exec(line)) !== null) {
      const rawVal = match[1].trim();

      // Verificar si hay excepción canónica 'allow-opacity' en la misma línea o en la inmediatamente anterior
      const hasInlineException = /allow-opacity/i.test(line);
      const prevLine = i > 0 ? lines[i - 1] : '';
      const hasPrevLineException = /allow-opacity/i.test(prevLine);

      if (!hasInlineException && !hasPrevLineException) {
        violations.push({
          file: filePath,
          line: lineNum,
          type: 'opacity',
          found: rawVal,
          message: `[${filePath}:${lineNum}] Uso no justificado de 'opacity: ${rawVal}'. Para atenuar texto use colores con contraste verificado de la paleta ($color-text-muted). Para excepciones justificadas (elementos no textuales, inputs ocultos, etc.), agregue '/* allow-opacity: <motivo> */'.`,
        });
      }
    }
  }

  return violations;
}

/**
 * Obtiene recursivamente todos los archivos a auditar en un directorio.
 */
function getFilesToAudit(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
        continue;
      }
      results.push(...getFilesToAudit(fullPath));
    } else if (entry.isFile()) {
      // Auditar todos los .scss y los .ts (excepto specs y tests)
      if (entry.name.endsWith('.scss')) {
        results.push(fullPath);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') && !entry.name.endsWith('.d.ts')) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

describe('Guardia de Piso Tipográfico y Opacity (PLAN-40)', () => {
  it('no debe contener font-size por debajo del piso de 12px ni opacity no justificada en src/', () => {
    const srcDir = path.join(process.cwd(), 'src');
    const files = getFilesToAudit(srcDir);
    const allViolations: StyleViolation[] = [];

    for (const file of files) {
      const relativePath = path.relative(srcDir, file).replace(/\\/g, '/');
      const content = fs.readFileSync(file, 'utf-8');
      const violations = auditStyleContent(content, relativePath);
      allViolations.push(...violations);
    }

    if (allViolations.length > 0) {
      const summary = allViolations.map((v) => ` - ${v.message}`).join('\n');
      expect.fail(`Se encontraron ${allViolations.length} violaciones de estilo:\n${summary}`);
    }

    expect(allViolations.length).toBe(0);
  });

  describe('Validación de reglas individuales', () => {
    it('detecta font-size en px inferior a 12px', () => {
      const sample = `
        .badge { font-size: 11px; }
        .tiny { font-size: 9.3px; }
      `;
      const violations = auditStyleContent(sample, 'sample.scss');
      expect(violations.length).toBe(2);
      expect(violations[0].type).toBe('font-size');
      expect(violations[0].found).toBe('11px');
      expect(violations[1].found).toBe('9.3px');
    });

    it('detecta font-size en rem inferior a 0.75rem', () => {
      const sample = `.label { font-size: 0.7rem; }`;
      const violations = auditStyleContent(sample, 'sample.scss');
      expect(violations.length).toBe(1);
      expect(violations[0].found).toBe('0.7rem');
    });

    it('detecta font-size en pt inferior a 9pt', () => {
      const sample = `.caption { font-size: 8pt; }`;
      const violations = auditStyleContent(sample, 'sample.scss');
      expect(violations.length).toBe(1);
      expect(violations[0].found).toBe('8pt');
    });

    it('detecta font-size en % inferior a 75%', () => {
      const sample = `.sub { font-size: 70%; }`;
      const violations = auditStyleContent(sample, 'sample.scss');
      expect(violations.length).toBe(1);
      expect(violations[0].found).toBe('70%');
    });

    it('detecta definiciones de variables SCSS ($font-size-*) por debajo del piso', () => {
      const sample = `
        $font-size-tiny: 0.6rem;
        $font-size-sub: 10px;
      `;
      const violations = auditStyleContent(sample, '_variables.scss');
      expect(violations.length).toBe(2);
      expect(violations[0].found).toBe('$font-size-tiny: 0.6rem');
      expect(violations[1].found).toBe('$font-size-sub: 10px');
    });

    it('detecta definiciones de custom properties (--font-size-*) por debajo del piso', () => {
      const sample = `
        :root {
          --font-size-small: 0.6rem;
          --font-size-badge: 11px;
        }
      `;
      const violations = auditStyleContent(sample, 'styles.scss');
      expect(violations.length).toBe(2);
      expect(violations[0].found).toBe('--font-size-small: 0.6rem');
      expect(violations[1].found).toBe('--font-size-badge: 11px');
    });

    it('admite definiciones de tokens válidos ($font-size-min, $font-size-glance, --font-size-base)', () => {
      const sample = `
        $font-size-min: 0.75rem;
        $font-size-glance: 0.8125rem;
        --font-size-base: 1rem;
      `;
      const violations = auditStyleContent(sample, 'tokens.scss');
      expect(violations.length).toBe(0);
    });

    it('admite font-size válidos ($font-size-min, 12px, 0.75rem, var(...), etc.)', () => {
      const sample = `
        .ok1 { font-size: $font-size-min; }
        .ok2 { font-size: $font-size-glance; }
        .ok3 { font-size: 12px; }
        .ok4 { font-size: 14px; }
        .ok5 { font-size: 0.75rem; }
        .ok6 { font-size: 1rem; }
        .ok7 { font-size: inherit; }
        .ok8 { font-size: var(--font-size-base); }
      `;
      const violations = auditStyleContent(sample, 'sample.scss');
      expect(violations.length).toBe(0);
    });

    it('detecta opacity sin comentario de justificación', () => {
      const sample = `.card-muted { opacity: 0.6; }`;
      const violations = auditStyleContent(sample, 'sample.scss');
      expect(violations.length).toBe(1);
      expect(violations[0].type).toBe('opacity');
      expect(violations[0].found).toBe('0.6');
    });

    it('permite opacity con comentario inline de allow-opacity', () => {
      const sample = `.logo:hover { opacity: 0.9; /* allow-opacity: hover transition */ }`;
      const violations = auditStyleContent(sample, 'sample.scss');
      expect(violations.length).toBe(0);
    });

    it('permite opacity con comentario allow-opacity en la línea anterior', () => {
      const sample = `
        // allow-opacity: checkbox oculto para switch accesible
        .switch-input { opacity: 0; width: 0; height: 0; }
      `;
      const violations = auditStyleContent(sample, 'sample.scss');
      expect(violations.length).toBe(0);
    });
  });
});
