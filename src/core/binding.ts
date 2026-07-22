import fs from 'node:fs/promises';
import path from 'node:path';
import { bindingFilePath } from './paths.js';
import { readYamlFile, writeYamlFile } from './yaml-file.js';
import type { ArtifactType } from './artifact-types.js';

export type BindingMode = 'linked' | 'subscribed';

export interface BoundProject {
  name: string;
  /** `linked` = writable (push/propose); `subscribed` = read-only module (pull-only). */
  mode: BindingMode;
  /** When true, a subscribed module is skipped during sync (kept as a local copy). */
  frozen?: boolean;
}

export interface ManagedArtifact {
  sourcePath: string;
  /** Name of the manifest project this artifact originates from. */
  project: string;
  type: ArtifactType;
  optional: boolean;
  localEdit: boolean;
  installedPaths: Record<string, string[]>;
  targetOverrides?: Record<string, Record<string, unknown>>;
}

export interface Binding {
  remote: string;
  branch: string;
  /** Bound projects, each with its mode. At most one may be `linked`. */
  projects: BoundProject[];
  tools: string[];
  lastSyncedCommit: string;
  lastSyncedHistoryCommit: string;
  artifacts: ManagedArtifact[];
}

/** Legacy binding shape (pre multi-project): a single `project` string. */
interface LegacyBinding {
  remote: string;
  branch: string;
  project?: string;
  projects?: BoundProject[];
  tools: string[];
  lastSyncedCommit: string;
  lastSyncedHistoryCommit: string;
  artifacts: Array<Omit<ManagedArtifact, 'project'> & { project?: string }>;
}

/**
 * Normalize a raw (possibly legacy) binding into the current shape:
 * - legacy `project: string` → `projects: [{ name, mode: 'linked' }]`
 * - artifacts missing `project` are attributed to the sole/writable project
 */
export function normalizeBinding(raw: LegacyBinding): Binding {
  let projects: BoundProject[];
  if (Array.isArray(raw.projects) && raw.projects.length > 0) {
    projects = raw.projects.map((bp) => ({
      name: bp.name,
      mode: bp.mode === 'subscribed' ? 'subscribed' : 'linked',
      ...(bp.frozen ? { frozen: true } : {}),
    }));
  } else {
    projects = [{ name: raw.project ?? '', mode: 'linked' }];
  }
  const fallbackProject =
    projects.find((p) => p.mode === 'linked')?.name ?? projects[0]?.name ?? '';
  const artifacts: ManagedArtifact[] = (raw.artifacts ?? []).map((a) => ({
    ...a,
    project: a.project ?? fallbackProject,
  }));
  return {
    remote: raw.remote,
    branch: raw.branch,
    projects,
    tools: raw.tools,
    lastSyncedCommit: raw.lastSyncedCommit,
    lastSyncedHistoryCommit: raw.lastSyncedHistoryCommit,
    artifacts,
  };
}

/** The single writable (`linked`) project name, if any. */
export function writableProjectName(binding: Binding): string | undefined {
  return binding.projects.find((p) => p.mode === 'linked')?.name;
}

/** Look up the mode of a bound project by name. */
export function projectMode(binding: Binding, projectName: string): BindingMode | undefined {
  return binding.projects.find((p) => p.name === projectName)?.mode;
}

export async function readBinding(projectDir: string): Promise<Binding | null> {
  const raw = await readYamlFile<LegacyBinding>(bindingFilePath(projectDir));
  return raw ? normalizeBinding(raw) : null;
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
