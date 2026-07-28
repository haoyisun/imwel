import fs from 'node:fs/promises';
import path from 'node:path';
import { historyRepoDir } from './paths.js';
import { pathExists } from './fs-utils.js';
import { runGit, showFileAtCommit } from './git.js';
import type { Binding } from './binding.js';

function historyOptions(projectDir: string) {
  const gitDir = path.join(historyRepoDir(projectDir), '.git');
  return {
    gitDir,
    workTree: projectDir,
  };
}

export async function ensureHistoryRepo(projectDir: string): Promise<void> {
  const historyDir = historyRepoDir(projectDir);
  const gitDir = path.join(historyDir, '.git');
  if (await pathExists(gitDir)) {
    return;
  }
  await fs.mkdir(historyDir, { recursive: true });
  await runGit(['init'], { cwd: historyDir });
  await runGit(['config', 'user.email', 'imwel@local'], { cwd: historyDir });
  await runGit(['config', 'user.name', 'imwel'], { cwd: historyDir });
}

export async function commitInstalledFiles(
  projectDir: string,
  paths: string[],
  message: string,
): Promise<string> {
  await ensureHistoryRepo(projectDir);
  const opts = historyOptions(projectDir);
  if (paths.length > 0) {
    await runGit(['add', '--', ...paths], opts);
  } else {
    await runGit(['add', '-A'], opts);
  }
  const status = await runGit(['status', '--porcelain', '--untracked-files=no'], opts);
  if (!status.stdout.trim()) {
    const { stdout } = await runGit(['rev-parse', 'HEAD'], opts);
    return stdout.trim();
  }
  await runGit(['commit', '-m', message], opts);
  const { stdout } = await runGit(['rev-parse', 'HEAD'], opts);
  return stdout.trim();
}

/**
 * Commit a managed-set transition without staging unrelated local edits.
 * Removed paths are dropped from the hidden history index while their working
 * tree files may remain on disk as unmanaged files.
 */
export async function commitManagedChanges(
  projectDir: string,
  writtenPaths: string[],
  unmanagedPaths: string[],
  message: string,
): Promise<string> {
  await ensureHistoryRepo(projectDir);
  const opts = historyOptions(projectDir);
  const written = [...new Set(writtenPaths)];
  const unmanaged = [...new Set(unmanagedPaths)].filter((item) => !written.includes(item));
  if (written.length > 0) {
    await runGit(['add', '--', ...written], opts);
  }
  if (unmanaged.length > 0) {
    await runGit(['rm', '--cached', '--ignore-unmatch', '--', ...unmanaged], opts);
  }
  const status = await runGit(['status', '--porcelain', '--untracked-files=no'], opts);
  if (!status.stdout.trim()) {
    const { stdout } = await runGit(['rev-parse', 'HEAD'], opts);
    return stdout.trim();
  }
  await runGit(['commit', '-m', message], opts);
  const { stdout } = await runGit(['rev-parse', 'HEAD'], opts);
  return stdout.trim();
}

export interface HistoryCommit {
  sha: string;
  subject: string;
  date: string;
}

export async function listHistoryCommits(projectDir: string): Promise<HistoryCommit[]> {
  await ensureHistoryRepo(projectDir);
  const opts = historyOptions(projectDir);
  try {
    const { stdout } = await runGit(
      ['log', '--pretty=format:%H%x09%s%x09%ci', '-n', '50'],
      opts,
    );
    if (!stdout.trim()) {
      return [];
    }
    return stdout
      .trim()
      .split('\n')
      .map((line) => {
        const [sha, subject, date] = line.split('\t');
        return { sha: sha ?? '', subject: subject ?? '', date: date ?? '' };
      });
  } catch {
    return [];
  }
}

export async function restoreToCommit(
  projectDir: string,
  commit: string,
  paths: string[] = [],
): Promise<void> {
  const opts = historyOptions(projectDir);
  if (paths.length > 0) {
    await runGit(['checkout', commit, '--', ...paths], opts);
  } else {
    await runGit(['checkout', commit, '--', '.'], opts);
  }
}

/** List all file paths recorded in a history commit. */
export async function listFilesAtCommit(
  projectDir: string,
  commit: string,
): Promise<string[]> {
  const opts = historyOptions(projectDir);
  const { stdout } = await runGit(['ls-tree', '-r', '--name-only', commit], opts);
  if (!stdout.trim()) {
    return [];
  }
  return stdout
    .trim()
    .split('\n')
    .map((line) => line.replace(/\\/g, '/'));
}

/**
 * Managed paths present in the binding but absent from the target history commit.
 * Only paths in the managed set are considered — never unmanaged files.
 */
export function managedPathsMissingFromCommit(
  managedPaths: string[],
  commitTreePaths: string[],
): string[] {
  const inCommit = new Set(commitTreePaths.map((p) => p.replace(/\\/g, '/')));
  return managedPaths
    .map((p) => p.replace(/\\/g, '/'))
    .filter((p) => !inCommit.has(p));
}

/**
 * Prune binding artifacts/installedPaths so they only reference paths that still exist
 * after a rollback (intersection of previous managed set and the commit tree).
 */
export function pruneBindingToCommitPaths(
  binding: Binding,
  commitTreePaths: string[],
): Binding {
  const inCommit = new Set(commitTreePaths.map((p) => p.replace(/\\/g, '/')));
  const artifacts = binding.artifacts
    .map((artifact) => {
      const installedPaths: Record<string, string[]> = {};
      for (const [tool, paths] of Object.entries(artifact.installedPaths)) {
        const kept = paths
          .map((p) => p.replace(/\\/g, '/'))
          .filter((p) => inCommit.has(p));
        if (kept.length > 0) {
          installedPaths[tool] = kept;
        }
      }
      if (Object.keys(installedPaths).length === 0) {
        return null;
      }
      return { ...artifact, installedPaths };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  return { ...binding, artifacts };
}

export async function readFileAtCommit(
  projectDir: string,
  commit: string,
  filePath: string,
): Promise<string | null> {
  const opts = historyOptions(projectDir);
  return showFileAtCommit(commit, filePath, opts);
}

export async function listDirtyPaths(projectDir: string, paths: string[]): Promise<string[]> {
  await ensureHistoryRepo(projectDir);
  const opts = historyOptions(projectDir);
  const dirty: string[] = [];
  for (const rel of paths) {
    const status = await runGit(['diff', '--quiet', 'HEAD', '--', rel], opts).then(
      () => false,
      () => true,
    );
    if (status) {
      dirty.push(rel);
    }
  }
  return dirty;
}

export function collectInstalledPaths(binding: Binding): string[] {
  const paths = new Set<string>();
  for (const artifact of binding.artifacts) {
    for (const toolPaths of Object.values(artifact.installedPaths)) {
      for (const p of toolPaths) {
        paths.add(p);
      }
    }
  }
  return [...paths];
}
