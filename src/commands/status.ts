import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { readBinding } from '../core/binding.js';
import { computeDrift } from '../core/drift.js';
import { remoteCacheDir } from '../core/paths.js';
import { ensureRemoteCache, checkoutBranch } from '../core/remote-cache.js';
import { checkRuleHealth, type HealthIssue } from '../core/rule-health.js';
import { error, info, success, warn } from '../core/cli-output.js';
import { t } from '../locales/index.js';

export async function runStatus(): Promise<number> {
  info(t('status.title'));
  const projectDir = process.cwd();
  const binding = await readBinding(projectDir);
  if (!binding) {
    error(t('status.noBinding'), { target: 'stdout' });
    return 1;
  }
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

  const cacheDir = remoteCacheDir(binding.remote);
  await ensureRemoteCache(binding.remote, { force: true });
  await checkoutBranch(cacheDir, binding.branch);
  const drift = await computeDrift(projectDir, binding, cacheDir, true);

  if (drift.remoteUpdated) {
    info(t('status.remoteUpdated'));
  }
  if (drift.localEdited) {
    info(t('status.localEdited', { paths: drift.dirtyPaths.join(', ') }));
  }
  if (!drift.remoteUpdated && !drift.localEdited) {
    success(t('status.clean'));
  }

  await reportRuleHealth(projectDir, binding.artifacts);
  return 0;
}

async function reportRuleHealth(
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
