import fs from 'node:fs/promises';
import path from 'node:path';
import { upsertBlock } from './marked-blocks.js';
import { pathExists } from './fs-utils.js';

export interface RenderedFileWrite {
  path: string;
  content: string;
  merge?: 'replace' | 'upsert-block';
  blockId?: string;
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
    } else {
      await fs.writeFile(abs, file.content, 'utf8');
    }
    written.push(file.path);
  }
  return written;
}
