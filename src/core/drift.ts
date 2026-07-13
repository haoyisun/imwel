import path from 'node:path';
import type { Binding } from './binding.js';
import { listDirtyPaths } from './history.js';
import { collectInstalledPaths } from './history.js';
import { branchCommit } from './remote-cache.js';

export interface DriftReport {
  remoteUpdated: boolean;
  localEdited: boolean;
  remoteCommit: string;
  lastSyncedCommit: string;
  dirtyPaths: string[];
}

export async function computeDrift(
  projectDir: string,
  binding: Binding,
  cacheDir: string,
  forceFetch = false,
): Promise<DriftReport> {
  const { ensureRemoteCache } = await import('./remote-cache.js');
  await ensureRemoteCache(binding.remote, { force: forceFetch });
  const remoteCommit = await branchCommit(cacheDir, binding.branch);
  const installed = collectInstalledPaths(binding);
  const dirtyPaths = await listDirtyPaths(projectDir, installed);
  return {
    remoteUpdated: remoteCommit !== binding.lastSyncedCommit,
    localEdited: dirtyPaths.length > 0,
    remoteCommit,
    lastSyncedCommit: binding.lastSyncedCommit,
    dirtyPaths,
  };
}

export function projectPathInRepo(repoRoot: string, projectPath: string): string {
  return path.join(repoRoot, projectPath).replace(/\\/g, '/');
}
