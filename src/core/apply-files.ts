import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { upsertBlock } from './marked-blocks.js';
import { pathExists } from './fs-utils.js';

export interface RenderedFileWrite {
  path: string;
  content: string;
  merge?: 'replace' | 'upsert-block' | 'ensure-yaml-list';
  blockId?: string;
  warningLocaleKey?: string;
  sourceAdapterId?: string;
  /** Manifest project this file was rendered from (for cross-source conflicts). */
  sourceProject?: string;
}

function ensureYamlListItem(existing: string, key: string, item: string): string {
  const doc = existing.trim() ? YAML.parse(existing) : {};
  const root = doc && typeof doc === 'object' && !Array.isArray(doc) ? (doc as Record<string, unknown>) : {};
  const current = root[key];
  let list: string[];
  if (Array.isArray(current)) {
    list = current.map(String);
  } else if (typeof current === 'string' && current.trim()) {
    list = [current];
  } else {
    list = [];
  }
  if (!list.includes(item)) {
    list.push(item);
  }
  root[key] = list;
  return YAML.stringify(root);
}

export async function applyRenderedFiles(
  projectDir: string,
  files: RenderedFileWrite[],
): Promise<string[]> {
  const written: string[] = [];
  for (const file of files) {
    const abs = path.join(projectDir, file.path);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    if (file.merge === 'upsert-block' && file.blockId) {
      const existing = (await pathExists(abs)) ? await fs.readFile(abs, 'utf8') : '';
      const merged = upsertBlock(existing, file.blockId, file.content);
      await fs.writeFile(abs, merged, 'utf8');
    } else if (file.merge === 'ensure-yaml-list' && file.blockId) {
      const existing = (await pathExists(abs)) ? await fs.readFile(abs, 'utf8') : '';
      const merged = ensureYamlListItem(existing, file.blockId, file.content);
      await fs.writeFile(abs, merged, 'utf8');
    } else {
      await fs.writeFile(abs, file.content, 'utf8');
    }
    written.push(file.path);
  }
  return written;
}
