import { describe, expect, it } from 'vitest';

interface NodeFs {
  readdirSync(path: string, options: { withFileTypes: true }): { name: string; isDirectory(): boolean; isFile(): boolean }[];
  readFileSync(path: string, encoding: string): string;
}

interface NodePath {
  join(...paths: string[]): string;
  relative(from: string, to: string): string;
}

declare const require: (module: string) => NodeFs & NodePath;
declare const process: { cwd: () => string };

const fs: NodeFs = require('node:fs');
const path: NodePath = require('node:path');

/** Templates de la app: los `.html` y los `.ts` con template embebido. */
function templates(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : templates(full);
    }
    const isTemplate = entry.name.endsWith('.html') || (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts'));
    return isTemplate ? [full] : [];
  });
}

/**
 * Guardia de layout (PLAN-64), sobre los archivos como la de tipografía: un test de componente no ve
 * `styles.scss` y la regla del `<main>` único es de todo el árbol, no de una pantalla.
 */
describe('Guardia de layout', () => {
  const root = process.cwd();

  it('el body usa la tipografía de la app', () => {
    const styles = fs.readFileSync(path.join(root, 'src/styles.scss'), 'utf8');
    expect(styles).toMatch(/body\s*\{[^}]*font-family:\s*\$font-base/);
  });

  it('el único landmark main es el del layout', () => {
    const appDir = path.join(root, 'src/app');
    const conMain = templates(appDir)
      .filter((file) => /<main[\s>]/.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(appDir, file).replace(/\\/g, '/'));

    expect(conMain).toEqual(['app.html']);
  });
});
