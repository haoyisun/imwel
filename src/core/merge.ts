import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { mergeFile, normalizeLineEndings } from './git.js';

export interface MergeResult {
  merged: string;
  hasConflicts: boolean;
}

export async function threeWayMergeText(
  base: string,
  ours: string,
  theirs: string,
): Promise<MergeResult> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-merge-'));
  const basePath = path.join(tmpDir, 'base');
  const oursPath = path.join(tmpDir, 'ours');
  const theirsPath = path.join(tmpDir, 'theirs');
  const normalizedBase = normalizeLineEndings(base);
  const normalizedOurs = normalizeLineEndings(ours);
  const normalizedTheirs = normalizeLineEndings(theirs);
  await fs.writeFile(basePath, normalizedBase, 'utf8');
  await fs.writeFile(oursPath, normalizedOurs, 'utf8');
  await fs.writeFile(theirsPath, normalizedTheirs, 'utf8');
  const exitCode = await mergeFile(oursPath, basePath, theirsPath);
  const merged = await fs.readFile(oursPath, 'utf8');
  await fs.rm(tmpDir, { recursive: true, force: true });
  return {
    merged,
    hasConflicts: exitCode !== 0 || merged.includes('<<<<<<<'),
  };
}
