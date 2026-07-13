import os from 'node:os';
import path from 'node:path';
import { walkForBindings } from './binding.js';

export async function listBoundDirectories(remoteAlias?: string): Promise<string[]> {
  const roots = [process.cwd(), os.homedir()];
  const seen = new Set<string>();
  const all: string[] = [];
  for (const root of roots) {
    const bindings = await walkForBindings(root);
    for (const dir of bindings) {
      if (seen.has(dir)) {
        continue;
      }
      seen.add(dir);
      all.push(dir);
    }
  }
  if (!remoteAlias) {
    return all;
  }
  const { readBinding } = await import('./binding.js');
  const filtered: string[] = [];
  for (const dir of all) {
    const binding = await readBinding(dir);
    if (binding?.remote === remoteAlias) {
      filtered.push(dir);
    }
  }
  return filtered;
}

export function registerBinding(_projectDir: string): void {
  // Bindings are persisted via writeBinding; this hook exists for future registry use.
}
