import fs from 'node:fs/promises';
import path from 'node:path';
import { getRemote, updateRemotePassiveCheck } from './config.js';
import { remoteCacheDir } from './paths.js';
import { pathExists } from './fs-utils.js';
import { runGit } from './git.js';
import { resolveFetchThrottleMs } from './throttle.js';

export interface EnsureCacheOptions {
  force?: boolean;
  throttleMs?: number;
  onFetch?: (alias: string) => void;
}

export async function ensureRemoteCache(
  alias: string,
  options: EnsureCacheOptions = {},
): Promise<string> {
  const remote = await getRemote(alias);
  if (!remote) {
    throw new Error(`Remote not found: ${alias}`);
  }
  const cacheDir = remoteCacheDir(alias);
  const exists = await pathExists(path.join(cacheDir, '.git'));
  if (!exists) {
    await fs.mkdir(path.dirname(cacheDir), { recursive: true });
    await runGit(['clone', remote.url, cacheDir]);
  }
  // force:true always fetches; throttle only applies to passive/background refreshes.
  // Per-remote throttle config is deferred — see resolveFetchThrottleMs.
  const throttleMs = options.throttleMs ?? resolveFetchThrottleMs();
  const lastCheck = remote.lastPassiveCheck ? Date.parse(remote.lastPassiveCheck) : 0;
  const shouldFetch = options.force || Date.now() - lastCheck >= throttleMs;
  if (shouldFetch) {
    options.onFetch?.(alias);
    await runGit(['fetch', '--prune', 'origin'], { cwd: cacheDir });
    if (!options.force) {
      await updateRemotePassiveCheck(alias, new Date().toISOString());
    }
  }
  return cacheDir;
}

export async function listBranches(cacheDir: string): Promise<string[]> {
  const { stdout } = await runGit(['branch', '-r', '--format=%(refname:short)'], { cwd: cacheDir });
  // `git branch -r --format=%(refname:short)` short-names the remote HEAD symbolic
  // ref (refs/remotes/origin/HEAD) down to the bare remote name ("origin"), not the
  // literal string "origin/HEAD" — so only entries that are actually prefixed with
  // "origin/" are real branches; anything else (that bare symref, or any future
  // symbolic-ref short form) is dropped rather than kept.
  return stdout
    .trim()
    .split('\n')
    .map((b) => b.trim())
    .filter((b) => b.startsWith('origin/'))
    .map((b) => b.slice('origin/'.length));
}

export async function checkoutBranch(cacheDir: string, branch: string): Promise<void> {
  try {
    await runGit(['checkout', branch], { cwd: cacheDir });
  } catch {
    await runGit(['checkout', '-B', branch, `origin/${branch}`], { cwd: cacheDir });
  }
  await runGit(['pull', '--ff-only', 'origin', branch], { cwd: cacheDir }).catch(() => undefined);
}

export async function branchCommit(cacheDir: string, branch: string): Promise<string> {
  await checkoutBranch(cacheDir, branch);
  const { stdout } = await runGit(['rev-parse', 'HEAD'], { cwd: cacheDir });
  return stdout.trim();
}

export async function remoteBranchCommit(cacheDir: string, branch: string): Promise<string> {
  const { stdout } = await runGit(['rev-parse', `origin/${branch}`], { cwd: cacheDir });
  return stdout.trim();
}
