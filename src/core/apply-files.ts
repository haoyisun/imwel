import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { extractBlock, upsertBlock } from './marked-blocks.js';
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
  /** Project-relative source path of the originating artifact (for actionable rename hints). */
  sourceArtifactPath?: string;
}

export type RenderedFileSafetyStatus =
  | 'absent'
  | 'managed-clean'
  | 'managed-dirty'
  | 'unmanaged-identical'
  | 'unmanaged-different';

export interface InspectedRenderedFile extends RenderedFileWrite {
  status: RenderedFileSafetyStatus;
  expectedContent: string;
}

export interface InspectRenderedFilesOptions {
  managedPaths?: ReadonlySet<string>;
  historyContent?: (targetPath: string) => Promise<string | null>;
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

function expectedContent(existing: string, file: RenderedFileWrite): string {
  if (file.merge === 'upsert-block' && file.blockId) {
    return upsertBlock(existing, file.blockId, file.content);
  }
  if (file.merge === 'ensure-yaml-list' && file.blockId) {
    return ensureYamlListItem(existing, file.blockId, file.content);
  }
  return file.content;
}

function unmanagedStatus(
  existing: string,
  expected: string,
  file: RenderedFileWrite,
): RenderedFileSafetyStatus {
  if (file.merge === 'upsert-block' && file.blockId) {
    const currentBlock = extractBlock(existing, file.blockId);
    return currentBlock === null || currentBlock === file.content.trimEnd()
      ? 'unmanaged-identical'
      : 'unmanaged-different';
  }
  if (file.merge === 'ensure-yaml-list' && file.blockId) {
    return 'unmanaged-identical';
  }
  return existing === expected ? 'unmanaged-identical' : 'unmanaged-different';
}

export async function inspectRenderedFiles(
  projectDir: string,
  files: RenderedFileWrite[],
  options: InspectRenderedFilesOptions = {},
): Promise<InspectedRenderedFile[]> {
  const managedPaths = new Set(
    [...(options.managedPaths ?? [])].map((targetPath) => targetPath.replace(/\\/g, '/')),
  );
  const inspected: InspectedRenderedFile[] = [];

  for (const file of files) {
    const absolutePath = path.join(projectDir, file.path);
    if (!(await pathExists(absolutePath))) {
      inspected.push({ ...file, status: 'absent', expectedContent: expectedContent('', file) });
      continue;
    }

    const existing = await fs.readFile(absolutePath, 'utf8');
    const expected = expectedContent(existing, file);
    const normalizedPath = file.path.replace(/\\/g, '/');
    if (managedPaths.has(normalizedPath)) {
      const base = options.historyContent ? await options.historyContent(file.path) : null;
      inspected.push({
        ...file,
        status: base !== null && existing === base ? 'managed-clean' : 'managed-dirty',
        expectedContent: expected,
      });
      continue;
    }

    inspected.push({
      ...file,
      status: unmanagedStatus(existing, expected, file),
      expectedContent: expected,
    });
  }

  return inspected;
}

export async function applyInspectedRenderedFiles(
  projectDir: string,
  files: InspectedRenderedFile[],
): Promise<string[]> {
  const written: string[] = [];
  for (const file of files) {
    const absolutePath = path.join(projectDir, file.path);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    let content = file.expectedContent;
    if (file.merge && await pathExists(absolutePath)) {
      content = expectedContent(await fs.readFile(absolutePath, 'utf8'), file);
    }
    await fs.writeFile(absolutePath, content, 'utf8');
    written.push(file.path);
  }
  return written;
}

export async function applyRenderedFiles(
  projectDir: string,
  files: RenderedFileWrite[],
): Promise<string[]> {
  return applyInspectedRenderedFiles(projectDir, await inspectRenderedFiles(projectDir, files));
}
