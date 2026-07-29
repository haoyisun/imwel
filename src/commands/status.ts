import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { readBinding } from '../core/binding.js';
import { collectInstalledPaths, listDirtyPaths } from '../core/history.js';
import {
  checkRemoteTargets,
  type RemoteCheckResult,
} from '../core/passive-check.js';
import { checkRuleHealth, type HealthIssue } from '../core/rule-health.js';
import { error, info, success, warn } from '../core/cli-output.js';
import { t } from '../locales/index.js';
import type { Binding } from '../core/binding.js';

export interface StatusDependencies {
  readBinding(projectDir: string): Promise<Binding | null>;
  checkRemoteTargets(
    projectDir: string,
    options: { force: boolean },
  ): Promise<RemoteCheckResult[]>;
  listDirtyPaths(projectDir: string, installedPaths: string[]): Promise<string[]>;
  reportRuleHealth(
    projectDir: string,
    artifacts: { installedPaths: Record<string, string[]> }[],
  ): Promise<void>;
}

const defaultDependencies: StatusDependencies = {
  readBinding,
  checkRemoteTargets,
  listDirtyPaths,
  reportRuleHealth,
};

function shortSha(sha: string | undefined): string {
  return sha?.slice(0, 8) ?? '?';
}

function reportRemoteTarget(result: RemoteCheckResult): void {
  const { target } = result;
  if (result.state === 'failed') {
    warn(
      t('status.target.failed', {
        source:
          target.source === 'binding'
            ? t('status.source.binding')
            : t('status.source.proposal'),
        remote: target.remote,
        branch: target.branch ?? '?',
      }),
      { target: 'stdout' },
    );
    return;
  }
  if (target.source === 'binding') {
    info(
      t(
        result.state === 'updated'
          ? 'status.binding.updated'
          : 'status.binding.current',
        {
          remote: target.remote,
          branch: target.branch ?? '?',
          base: shortSha(target.baseCommit),
          current: shortSha(result.currentCommit),
        },
      ),
    );
    return;
  }
  if (result.state === 'unknown') {
    info(
      t('status.proposal.unknown', {
        project: target.project ?? '?',
        remote: target.remote,
      }),
    );
    return;
  }
  info(
    t(
      result.state === 'updated'
        ? 'status.proposal.updated'
        : 'status.proposal.current',
      {
        project: target.project ?? '?',
        remote: target.remote,
        branch: target.branch ?? '?',
        base: shortSha(target.baseCommit),
        current: shortSha(result.currentCommit),
      },
    ),
  );
}

export async function runStatus(
  projectDir = process.cwd(),
  dependencies: StatusDependencies = defaultDependencies,
): Promise<number> {
  info(t('status.title'));
  const [binding, remoteResults] = await Promise.all([
    dependencies.readBinding(projectDir),
    dependencies.checkRemoteTargets(projectDir, { force: true }),
  ]);
  if (!binding && remoteResults.length === 0) {
    error(t('status.noTargets'), { target: 'stdout' });
    return 1;
  }
  if (binding) {
    info(t('status.remote', { remote: binding.remote, branch: binding.branch }));
    const writable = binding.projects.filter((p) => p.mode === 'linked').map((p) => p.name);
    const modules = binding.projects
      .filter((p) => p.mode === 'subscribed')
      .map((p) => (p.frozen ? t('status.moduleFrozen', { name: p.name }) : p.name));
    if (writable.length > 0) {
      info(t('status.project', { project: writable.join(', ') }));
    }
    if (modules.length > 0) {
      info(t('status.modules', { modules: modules.join(', ') }));
    }
    info(t('status.tools', { tools: binding.tools.join(', ') }));
    info(t('status.lastSynced', { sha: binding.lastSyncedCommit.slice(0, 8) }));
  }

  for (const result of remoteResults) {
    reportRemoteTarget(result);
  }

  if (binding) {
    const dirtyPaths = await dependencies.listDirtyPaths(
      projectDir,
      collectInstalledPaths(binding),
    );
    if (dirtyPaths.length > 0) {
      info(t('status.localEdited', { paths: dirtyPaths.join(', ') }));
    } else if (remoteResults.every((result) => result.state === 'current')) {
      success(t('status.clean'));
    }
    await dependencies.reportRuleHealth(projectDir, binding.artifacts);
  }
  return remoteResults.some((result) => result.state === 'failed') ? 1 : 0;
}

export async function reportRuleHealth(
  projectDir: string,
  artifacts: { installedPaths: Record<string, string[]> }[],
): Promise<void> {
  const relPaths = [
    ...new Set(
      artifacts.flatMap((a) => Object.values(a.installedPaths).flat()),
    ),
  ];
  const files: { path: string; content: string }[] = [];
  for (const rel of relPaths) {
    try {
      files.push({ path: rel, content: await fs.readFile(path.join(projectDir, rel), 'utf8') });
    } catch {
      // File missing (drift already reports that); skip health for it.
    }
  }

  const exists = (ref: string, fromFileDir: string): boolean =>
    existsSync(path.join(projectDir, ref)) ||
    existsSync(path.join(projectDir, fromFileDir, ref));

  const issues = checkRuleHealth(files, exists);
  info(t('health.title'));
  if (issues.length === 0) {
    success(t('health.clean'));
    return;
  }
  for (const issue of issues) {
    warn(formatHealthIssue(issue), { target: 'stdout' });
  }
}

export function formatHealthIssue(issue: HealthIssue): string {
  const ref = issue.ref ?? '';
  return t(`health.${issue.code}` as 'health.rule.empty', { path: issue.path, ref });
}
