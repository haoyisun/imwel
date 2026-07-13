import path from 'node:path';
import { fileURLToPath } from 'node:url';

const thisFile = fileURLToPath(import.meta.url);

export function packageRoot(): string {
  return path.resolve(path.dirname(thisFile), '..', '..');
}

export function templatesDir(): string {
  return path.join(packageRoot(), 'templates');
}
