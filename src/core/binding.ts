import fs from 'node:fs/promises';
import path from 'node:path';
import { bindingFilePath } from './paths.js';
import { readYamlFile, writeYamlFile } from './yaml-file.js';
import type { ArtifactType } from './artifact-types.js';

export interface ManagedArtifact {
  sourcePath: string;
  type: ArtifactType;
  optional: boolean;
  localEdit: boolean;
  installedPaths: Record<string, string[]>;
  targetOverrides?: Record<string, Record<string, unknown>>;
}

export interface Binding {
  remote: string;
  branch: string;
  project: string;
  tools: string[];
  lastSyncedCommit: string;
  lastSyncedHistoryCommit: string;
  artifacts: ManagedArtifact[];
}

export async function readBinding(projectDir: string): Promise<Binding | null> {
  return readYamlFile<Binding>(bindingFilePath(projectDir));
}

export async function writeBinding(projectDir: string, binding: Binding): Promise<void> {
  await writeYamlFile(bindingFilePath(projectDir), binding);
}

export async function bindingExists(projectDir: string): Promise<boolean> {
  const binding = await readBinding(projectDir);
  return binding !== null;
}

export async function findBindingsReferencingRemote(
  searchRoots: string[],
  remoteAlias: string,
): Promise<string[]> {
  const matches: string[] = [];
  for (const root of searchRoots) {
    const binding = await readBinding(root);
    if (binding?.remote === remoteAlias) {
      matches.push(root);
    }
  }
  return matches;
}

export async function walkForBindings(startDir: string, maxDepth = 6): Promise<string[]> {
  const found: string[] = [];
  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth) {
      return;
    }
    const bindingPath = bindingFilePath(dir);
    try {
      await fs.access(bindingPath);
      found.push(dir);
      return;
    } catch {
      // continue
    }
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }
      await walk(path.join(dir, entry.name), depth + 1);
    }
  }
  await walk(startDir, 0);
  return found;
}
