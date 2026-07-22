import fs from 'node:fs/promises';
import path from 'node:path';
import { discoverArtifacts } from './artifacts.js';
import type { Binding, ManagedArtifact } from './binding.js';
import type { Artifact } from './artifact-types.js';
import { applyRenderedFiles } from './apply-files.js';
import { commitInstalledFiles } from './history.js';
import { threeWayMergeText } from './merge.js';
import { readManifest, resolveConventions } from './manifest.js';
import { renderArtifacts } from './render.js';
import type { PathConflict } from '../adapters/strategies/dedupe.js';
import { diffNameStatus, showFileAtCommit } from './git.js';
import { pendingSyncPath } from './paths.js';
import { readYamlFile, writeYamlFile } from './yaml-file.js';

function collectInstalledPathsFromManaged(managed: ManagedArtifact[], tools: string[]): string[] {
  const paths = new Set<string>();
  for (const artifact of managed) {
    for (const tool of tools) {
      for (const p of artifact.installedPaths[tool] ?? []) {
        paths.add(p);
      }
    }
  }
  return [...paths];
}

export interface SyncPlanItem {
  sourcePath: string;
  project: string;
  status: 'added' | 'modified' | 'removed';
}

export interface SyncPlan {
  items: SyncPlanItem[];
  artifacts: Artifact[];
  remoteCommit: string;
}

export async function planSync(
  cacheDir: string,
  binding: Binding,
  selectedOptional?: Set<string>,
): Promise<SyncPlan> {
  const manifest = await readManifest(cacheDir);
  const items: SyncPlanItem[] = [];
  const artifacts: Artifact[] = [];

  // Walk every bound project (skipping frozen modules); diff and discover per
  // project so same-named source paths in different projects never interfere.
  for (const bound of binding.projects) {
    if (bound.frozen) {
      continue;
    }
    let resolved;
    try {
      resolved = resolveConventions(manifest, bound.name);
    } catch {
      // Project no longer in manifest; nothing to sync for it.
      continue;
    }
    const { project, conventions } = resolved;
    const projectPrefix = project.path.replace(/\\/g, '/');
    const diff = await diffNameStatus(binding.lastSyncedCommit, 'HEAD', {
      cwd: cacheDir,
      paths: [projectPrefix],
    });
    for (const entry of diff) {
      const rel = entry.path.startsWith(`${projectPrefix}/`)
        ? entry.path.slice(projectPrefix.length + 1)
        : entry.path;
      let status: SyncPlanItem['status'] = 'modified';
      if (entry.status === 'A' || entry.status.startsWith('A')) {
        status = 'added';
      } else if (entry.status === 'D' || entry.status.startsWith('D')) {
        status = 'removed';
      }
      items.push({ sourcePath: rel, project: bound.name, status });
    }
    artifacts.push(...(await discoverArtifacts(cacheDir, project, conventions, selectedOptional)));
  }

  const { stdout } = await import('./git.js').then((m) =>
    m.runGit(['rev-parse', 'HEAD'], { cwd: cacheDir }),
  );
  return { items, artifacts, remoteCommit: stdout.trim() };
}

export function planRemovals(plan: SyncPlan, binding: Binding): ManagedArtifact[] {
  // Match on the composite (project, sourcePath) key so same-named source paths
  // in different projects don't cross-remove each other.
  const removedKeys = new Set(
    plan.items
      .filter((item) => item.status === 'removed')
      .map((item) => `${item.project}\u0000${item.sourcePath}`),
  );
  return binding.artifacts.filter((artifact) =>
    removedKeys.has(`${artifact.project}\u0000${artifact.sourcePath}`),
  );
}

export interface PendingSyncState {
  remoteCommit: string;
  conflictPaths: string[];
}

export interface WriteSyncResult {
  binding: Binding;
  hasConflicts: boolean;
  pathConflicts?: PathConflict[];
  warningLocaleKeys?: string[];
  writtenPaths?: string[];
  skippedWrite?: boolean;
}

export async function writeSyncResults(
  projectDir: string,
  binding: Binding,
  plan: SyncPlan,
  tools: string[],
  continueMode = false,
): Promise<WriteSyncResult> {
  const overrideMap = new Map<string, Record<string, Record<string, unknown>>>();
  for (const artifact of binding.artifacts) {
    if (artifact.targetOverrides) {
      overrideMap.set(artifact.sourcePath, artifact.targetOverrides);
    }
  }
  const {
    files,
    managed,
    conflicts: pathConflicts,
    warningLocaleKeys,
  } = renderArtifacts(plan.artifacts, tools, overrideMap);

  if (pathConflicts.length && !continueMode) {
    return {
      binding,
      hasConflicts: false,
      pathConflicts,
      warningLocaleKeys,
      skippedWrite: true,
    };
  }

  const pending = continueMode ? await readYamlFile<PendingSyncState>(pendingSyncPath(projectDir)) : null;
  const conflictPaths: string[] = pending?.conflictPaths ?? [];
  let hasConflicts = false;

  if (!continueMode) {
    const dirtyPaths = new Set(
      await import('./history.js').then((m) =>
        m.listDirtyPaths(projectDir, collectInstalledPathsFromManaged(managed, tools)),
      ),
    );
    for (const artifact of plan.artifacts) {
      const artifactProject = artifact.project ?? '';
      const existing = binding.artifacts.find(
        (a) => a.sourcePath === artifact.sourcePath && a.project === artifactProject,
      );
      if (!existing || !binding.lastSyncedHistoryCommit) {
        continue;
      }
      const managedEntry = managed.find(
        (m) => m.sourcePath === artifact.sourcePath && m.project === artifactProject,
      );
      if (!managedEntry) {
        continue;
      }
      for (const tool of tools) {
        const paths = managedEntry.installedPaths[tool] ?? [];
        for (const installedPath of paths) {
          const base = await import('./history.js').then((m) =>
            m.readFileAtCommit(projectDir, binding.lastSyncedHistoryCommit, installedPath),
          );
          if (!base) {
            continue;
          }
          const currentPath = path.join(projectDir, installedPath);
          let current = '';
          try {
            current = await fs.readFile(currentPath, 'utf8');
          } catch {
            continue;
          }
          const rendered = files.find((f) => f.path === installedPath);
          if (!rendered) {
            continue;
          }
          if (!dirtyPaths.has(installedPath)) {
            continue;
          }
          const merge = await threeWayMergeText(base, current, rendered.content);
          if (merge.hasConflicts) {
            hasConflicts = true;
            conflictPaths.push(installedPath);
            await fs.writeFile(currentPath, merge.merged, 'utf8');
          } else {
            rendered.content = merge.merged;
          }
        }
      }
    }
  }

  if (hasConflicts && !continueMode) {
    await writeYamlFile(pendingSyncPath(projectDir), {
      remoteCommit: plan.remoteCommit,
      conflictPaths,
    });
    return { binding, hasConflicts: true, warningLocaleKeys };
  }

  const writtenPaths = await applyRenderedFiles(projectDir, files);
  const historyCommit = await commitInstalledFiles(projectDir, writtenPaths, 'imwel sync');
  // Frozen modules are excluded from the sync plan, so their artifacts are not
  // in `managed`; preserve the recorded entries so status/unfreeze keep working.
  const frozenProjects = new Set(
    binding.projects.filter((bp) => bp.frozen).map((bp) => bp.name),
  );
  const preserved = binding.artifacts.filter((a) => frozenProjects.has(a.project));
  const updatedBinding: Binding = {
    ...binding,
    lastSyncedCommit: plan.remoteCommit,
    lastSyncedHistoryCommit: historyCommit,
    artifacts: [...managed, ...preserved],
  };
  await writeYamlFile(pendingSyncPath(projectDir), null as unknown as PendingSyncState);
  try {
    await fs.rm(pendingSyncPath(projectDir), { force: true });
  } catch {
    // ignore
  }
  return {
    binding: updatedBinding,
    hasConflicts: false,
    warningLocaleKeys,
    writtenPaths,
  };
}

export async function loadArtifactAtCommit(
  cacheDir: string,
  projectPath: string,
  sourcePath: string,
  commit: string,
): Promise<string | null> {
  const full = path.posix.join(projectPath.replace(/\\/g, '/'), sourcePath);
  return showFileAtCommit(commit, full, { cwd: cacheDir });
}
