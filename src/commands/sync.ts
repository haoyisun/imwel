import * as p from '@clack/prompts';
import { readBinding, writeBinding } from '../core/binding.js';
import { computeDrift } from '../core/drift.js';
import { isInteractiveStdin } from '../core/cli-flags.js';
import { remoteCacheDir } from '../core/paths.js';
import { checkoutBranch, ensureRemoteCache } from '../core/remote-cache.js';
import { planSync, writeSyncResults } from '../core/sync-engine.js';
import type { PathConflict } from '../adapters/strategies/dedupe.js';
import { pathExists } from '../core/fs-utils.js';
import { pendingSyncPath } from '../core/paths.js';
import { t } from '../locales/index.js';
import type { LocaleKey } from '../locales/en.js';

function printRenderSideEffects(
  warningLocaleKeys: string[],
  tools: string[],
  writtenPaths: string[],
): void {
  for (const key of warningLocaleKeys) {
    console.warn(t(key as LocaleKey));
  }
  if (
    tools.includes('codex') &&
    writtenPaths.some((p) => p.replace(/\\/g, '/').includes('.agents/skills/'))
  ) {
    console.log(t('adapter.codex.skillsHint'));
  }
}

function printPathConflicts(conflicts: PathConflict[]): void {
  for (const conflict of conflicts) {
    console.error(
      t('adapter.pathConflict', {
        path: conflict.path,
        tools: conflict.adapterIds.join(', '),
      }),
    );
  }
  console.error(t('adapter.pathConflict.hint'));
}

export interface SyncOptions {
  yes?: boolean;
  continue?: boolean;
}

export async function runSync(opts: SyncOptions | boolean = {}): Promise<number> {
  // Backward-compatible: runSync(true) used to mean continueMode.
  const options: SyncOptions =
    typeof opts === 'boolean' ? { continue: opts } : opts;
  const continueMode = Boolean(options.continue);

  p.intro(continueMode ? t('sync.continue') : t('sync.title'));
  const projectDir = process.cwd();
  const binding = await readBinding(projectDir);
  if (!binding) {
    console.error(t('sync.noBinding'));
    return 1;
  }

  const spinner = p.spinner();
  spinner.start(t('sync.fetching', { alias: binding.remote }));
  const cacheDir = await ensureRemoteCache(binding.remote, { force: true });
  await checkoutBranch(cacheDir, binding.branch);
  spinner.stop(t('common.done'));

  if (continueMode) {
    if (!(await pathExists(pendingSyncPath(projectDir)))) {
      console.error(t('sync.pendingNone'));
      return 1;
    }
    const plan = await planSync(cacheDir, binding);
    const result = await writeSyncResults(projectDir, binding, plan, binding.tools, true);
    await writeBinding(projectDir, result.binding);
    console.log(t('sync.success', { sha: result.binding.lastSyncedCommit }));
    p.outro(t('common.done'));
    return 0;
  }

  const drift = await computeDrift(projectDir, binding, cacheDir, true);
  if (!drift.remoteUpdated && !drift.localEdited) {
    console.log(t('sync.upToDate'));
    p.outro(t('common.done'));
    return 0;
  }

  const plan = await planSync(cacheDir, binding);
  if (plan.items.length === 0 && !drift.remoteUpdated) {
    console.log(t('sync.upToDate'));
    return 0;
  }

  console.log(t('sync.plan.title'));
  for (const item of plan.items) {
    const key =
      item.status === 'added'
        ? 'sync.plan.added'
        : item.status === 'removed'
          ? 'sync.plan.removed'
          : 'sync.plan.modified';
    console.log(t(key, { path: item.sourcePath }));
  }

  if (!options.yes) {
    if (!isInteractiveStdin()) {
      console.error(t('cli.nonInteractiveConfirmRequired'));
      return 1;
    }
    const confirm = await p.confirm({
      message: t('sync.confirm', { count: plan.items.length || plan.artifacts.length }),
      initialValue: true,
    });
    if (p.isCancel(confirm) || !confirm) {
      console.log(t('common.cancelled'));
      return 1;
    }
  }

  const result = await writeSyncResults(projectDir, binding, plan, binding.tools, false);
  if (result.skippedWrite && result.pathConflicts?.length) {
    printPathConflicts(result.pathConflicts);
    return 1;
  }
  if (result.hasConflicts) {
    const pending = await import('../core/yaml-file.js').then((m) =>
      m.readYamlFile<{ conflictPaths: string[] }>(pendingSyncPath(projectDir)),
    );
    console.error(t('sync.conflicts', { paths: (pending?.conflictPaths ?? []).join(', ') }));
    return 1;
  }
  await writeBinding(projectDir, result.binding);
  printRenderSideEffects(
    result.warningLocaleKeys ?? [],
    binding.tools,
    result.writtenPaths ?? [],
  );
  console.log(t('sync.success', { sha: result.binding.lastSyncedCommit }));
  p.outro(t('common.done'));
  return 0;
}
