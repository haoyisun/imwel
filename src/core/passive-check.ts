import { readBinding, type Binding } from './binding.js';
import {
  readPendingProposalsReadonly,
  type PendingProposal,
} from './propose.js';
import {
  ensureRemoteCache,
  remoteBranchCommit,
} from './remote-cache.js';
import { resolveFetchThrottleMs } from './throttle.js';
import { t } from '../locales/index.js';
import { info, warn } from './cli-output.js';

export interface RemoteTarget {
  source: 'binding' | 'proposal';
  remote: string;
  branch?: string;
  baseCommit?: string;
  project?: string;
}

export interface RemoteCheckResult {
  target: RemoteTarget;
  state: 'current' | 'updated' | 'unknown' | 'failed';
  currentCommit?: string;
  error?: string;
}

export interface RemoteCheckDependencies {
  readBinding(projectDir: string): Promise<Binding | null>;
  readProposals(projectDir: string): Promise<PendingProposal[]>;
  ensureRemoteCache(
    remote: string,
    options: { force?: boolean; throttleMs?: number; onFetch?: (alias: string) => void },
  ): Promise<string>;
  readRemoteCommit(cacheDir: string, branch: string): Promise<string>;
}

const defaultDependencies: RemoteCheckDependencies = {
  readBinding,
  readProposals: readPendingProposalsReadonly,
  ensureRemoteCache,
  readRemoteCommit: remoteBranchCommit,
};

export function collectRemoteTargets(
  binding: Binding | null,
  proposals: PendingProposal[],
): RemoteTarget[] {
  const targets: RemoteTarget[] = [];
  if (binding) {
    targets.push({
      source: 'binding',
      remote: binding.remote,
      branch: binding.branch,
      baseCommit: binding.lastSyncedCommit,
    });
  }
  for (const proposal of proposals) {
    targets.push({
      source: 'proposal',
      remote: proposal.remote,
      branch: proposal.baseBranch,
      baseCommit: proposal.baseCommit,
      project: proposal.project,
    });
  }
  return targets;
}

export async function checkRemoteTargets(
  projectDir: string,
  options: {
    force?: boolean;
    throttleMs?: number;
    onFetch?: (alias: string) => void;
  } = {},
  dependencies: RemoteCheckDependencies = defaultDependencies,
): Promise<RemoteCheckResult[]> {
  const [binding, proposals] = await Promise.all([
    dependencies.readBinding(projectDir),
    dependencies.readProposals(projectDir),
  ]);
  const targets = collectRemoteTargets(binding, proposals);
  if (targets.length === 0) {
    return [];
  }

  const results = new Map<RemoteTarget, RemoteCheckResult>();
  for (const target of targets) {
    if (!target.branch || !target.baseCommit) {
      results.set(target, { target, state: 'unknown' });
    }
  }

  const comparableByRemote = new Map<string, RemoteTarget[]>();
  for (const target of targets) {
    if (!target.branch || !target.baseCommit) {
      continue;
    }
    const remoteTargets = comparableByRemote.get(target.remote) ?? [];
    remoteTargets.push(target);
    comparableByRemote.set(target.remote, remoteTargets);
  }

  for (const [remote, remoteTargets] of comparableByRemote) {
    let cacheDir: string;
    try {
      cacheDir = await dependencies.ensureRemoteCache(remote, options);
    } catch (error) {
      for (const target of remoteTargets) {
        results.set(target, {
          target,
          state: 'failed',
          error: error instanceof Error ? error.message : String(error),
        });
      }
      continue;
    }

    const commits = new Map<string, string | Error>();
    for (const branch of new Set(remoteTargets.map((target) => target.branch!))) {
      try {
        commits.set(branch, await dependencies.readRemoteCommit(cacheDir, branch));
      } catch (error) {
        commits.set(branch, error instanceof Error ? error : new Error(String(error)));
      }
    }
    for (const target of remoteTargets) {
      const current = commits.get(target.branch!);
      if (current instanceof Error || current === undefined) {
        results.set(target, {
          target,
          state: 'failed',
          error: current?.message ?? 'Remote branch commit is unavailable',
        });
      } else {
        results.set(target, {
          target,
          state: current === target.baseCommit ? 'current' : 'updated',
          currentCommit: current,
        });
      }
    }
  }

  return targets.map((target) => results.get(target)!);
}

function shortSha(sha: string): string {
  return sha.slice(0, 8);
}

export function formatPassiveCheckWarnings(results: RemoteCheckResult[]): string[] {
  const lines: string[] = [];
  const updated = results.filter(
    (result): result is RemoteCheckResult & { currentCommit: string } =>
      result.state === 'updated' && Boolean(result.currentCommit),
  );
  if (updated.length > 0) {
    lines.push(t('passive.updateTitle'));
    const groups = new Map<string, typeof updated>();
    for (const result of updated) {
      const key = `${result.target.remote}\u0000${result.target.branch}`;
      const group = groups.get(key) ?? [];
      group.push(result);
      groups.set(key, group);
    }
    for (const group of groups.values()) {
      const first = group[0]!;
      const bindingCount = group.filter((item) => item.target.source === 'binding').length;
      const proposalCount = group.length - bindingCount;
      const sources = [
        ...(bindingCount > 0 ? [t('passive.source.binding')] : []),
        ...(proposalCount > 0
          ? [t('passive.source.proposals', { count: proposalCount })]
          : []),
      ].join(t('passive.source.separator'));
      const bases = [
        ...new Set(group.map((item) => shortSha(item.target.baseCommit!))),
      ].join('/');
      lines.push(
        t('passive.updateSummary', {
          remote: first.target.remote,
          branch: first.target.branch!,
          base: bases,
          current: shortSha(first.currentCommit),
          sources,
        }),
      );
    }
    lines.push(t('passive.updateNext'));
  }

  const failed = results.filter((result) => result.state === 'failed');
  const failedTargets = [
    ...new Set(
      failed.map(
        ({ target }) => `${target.remote}/${target.branch ?? '?'}`,
      ),
    ),
  ];
  if (failedTargets.length > 0) {
    lines.push(t('passive.failure', { targets: failedTargets.join(', ') }));
  }
  return lines;
}

export function shouldRunPassiveCheck(subcommand: string | undefined): boolean {
  return !new Set(['sync', 'status', 'propose', 'binding']).has(subcommand ?? '');
}

export async function runPassiveCheckIfDue(
  projectDir = process.cwd(),
  throttleMs = resolveFetchThrottleMs(),
  dependencies: RemoteCheckDependencies = defaultDependencies,
): Promise<void> {
  try {
    const results = await checkRemoteTargets(
      projectDir,
      {
        throttleMs,
        onFetch: (alias) => info(t('passive.checking', { alias })),
      },
      dependencies,
    );
    for (const line of formatPassiveCheckWarnings(results)) {
      warn(line);
    }
  } catch {
    warn(t('passive.failure', { targets: t('passive.failure.unknown') }));
  }
}
