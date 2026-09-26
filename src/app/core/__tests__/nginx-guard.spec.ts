import { describe, expect, it } from 'vitest';

interface NodeFs {
  existsSync(path: string): boolean;
  readFileSync(path: string, encoding: string): string;
}

interface NodePath {
  join(...paths: string[]): string;
}

declare const require: (module: string) => NodeFs & NodePath;
declare const process: { cwd: () => string };

const fs: NodeFs = require('node:fs');
const path: NodePath = require('node:path');

describe('Guardia de Configuración NGINX (PLAN-45)', () => {
  const nginxConfPath = path.join(process.cwd(), 'docker', 'nginx.conf');

  it('el archivo docker/nginx.conf debe existir', () => {
    expect(fs.existsSync(nginxConfPath)).toBe(true);
  });

  it('debe configurar proxy_set_header X-Forwarded-For $remote_addr para pisar cabeceras de cliente', () => {
    const content = fs.readFileSync(nginxConfPath, 'utf-8');
    expect(content).toMatch(/proxy_set_header\s+X-Forwarded-For\s+\$remote_addr\s*;/);
  });

  it('no debe utilizar $proxy_add_x_forwarded_for para evitar vulnerabilidades de spoofing', () => {
    const content = fs.readFileSync(nginxConfPath, 'utf-8');
    expect(content).not.toContain('$proxy_add_x_forwarded_for');
  });

  it('debe mantener el comentario de herencia de directivas de proxy para los location', () => {
    const content = fs.readFileSync(nginxConfPath, 'utf-8');
    expect(content).toContain('Directivas comunes de proxy: los `location` de abajo las heredan');
  });

  it('no debe incluir unsafe-eval: el backoffice sólo usa el formulario en readonly y ahí no se compilan schemas (PLAN-59)', () => {
    const content = fs.readFileSync(nginxConfPath, 'utf-8');
    expect(content).toContain('add_header Content-Security-Policy');
    expect(content).toMatch(/script-src\s+'self';/);
    expect(content).not.toMatch(/Content-Security-Policy.*script-src\s+[^;]*'unsafe-eval'/);
  });
});
