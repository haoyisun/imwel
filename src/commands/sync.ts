import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import { readBinding, writeBinding, type Binding, type BoundProject } from '../core/binding.js';
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
    if (conflict.projects.length > 1) {
      console.error(
        t('adapter.pathConflict.sources', {
          path: conflict.path,
          sources: conflict.projects.join(', '),
        }),
      );
    } else {
      console.error(
        t('adapter.pathConflict', {
          path: conflict.path,
          tools: conflict.adapterIds.join(', '),
        }),
      );
    }
  }
  console.error(t('adapter.pathConflict.hint'));
}

export interface SyncOptions {
  yes?: boolean;
  continue?: boolean;
}

/**
 * Read-only modules must never be silently overwritten. When a subscribed
 * module has local edits, ask the user to discard / freeze / uninstall before
 * the normal sync proceeds. Returns the (possibly mutated) binding.
 */
async function resolveReadOnlyModuleDrift(
  projectDir: string,
  binding: Binding,
  dirtyPaths: string[],
  yes: boolean,
): Promise<Binding> {
  const dirty = new Set(dirtyPaths);
  const subscribed = binding.projects.filter((bp) => bp.mode === 'subscribed' && !bp.frozen);
  if (subscribed.length === 0) {
    return binding;
  }

  let projects: BoundProject[] = binding.projects;
  let artifacts = binding.artifacts;

  for (const bound of subscribed) {
    const moduleArtifacts = binding.artifacts.filter((a) => a.project === bound.name);
    const modulePaths = moduleArtifacts.flatMap((a) => Object.values(a.installedPaths).flat());
    const editedPaths = modulePaths.filter((rel) => dirty.has(rel));
    if (editedPaths.length === 0) {
      continue;
    }

    // Non-interactive default: freeze (never destroy local edits without consent).
    type DriftChoice = 'discard' | 'freeze' | 'uninstall';
    let choice: DriftChoice = 'freeze';
    if (!yes && isInteractiveStdin()) {
      const selected = (await p.select({
        message: t('sync.moduleDrift.prompt', {
          module: bound.name,
          paths: editedPaths.join(', '),
        }),
        options: [
          { value: 'discard', label: t('sync.moduleDrift.discard') },
          { value: 'freeze', label: t('sync.moduleDrift.freeze') },
          { value: 'uninstall', label: t('sync.moduleDrift.uninstall') },
        ],
        initialValue: 'freeze',
      })) as string;
      if (p.isCancel(selected)) {
        console.log(t('common.cancelled'));
        continue;
      }
      choice = selected as DriftChoice;
    }

    if (choice === 'discard') {
      // Delete local edits so the normal sync rewrites them from upstream.
      for (const rel of editedPaths) {
        await fs.rm(path.join(projectDir, rel), { force: true });
      }
      console.log(t('sync.moduleDrift.discarded', { module: bound.name }));
    } else if (choice === 'freeze') {
      projects = projects.map((bp) =>
        bp.name === bound.name ? { ...bp, frozen: true } : bp,
      );
      console.log(t('sync.moduleDrift.frozen', { module: bound.name }));
    } else {
      for (const rel of modulePaths) {
        await fs.rm(path.join(projectDir, rel), { force: true });
      }
      projects = projects.filter((bp) => bp.name !== bound.name);
      artifacts = artifacts.filter((a) => a.project !== bound.name);
      console.log(t('sync.moduleDrift.uninstalled', { module: bound.name }));
    }
  }

  if (projects === binding.projects && artifacts === binding.artifacts) {
    return binding;
  }
  const next: Binding = { ...binding, projects, artifacts };
  await writeBinding(projectDir, next);
  return next;
}

export async function runSync(opts: SyncOptions | boolean = {}): Promise<number> {
  // Backward-compatible: runSync(true) used to mean continueMode.
  const options: SyncOptions =
    typeof opts === 'boolean' ? { continue: opts } : opts;
  const continueMode = Boolean(options.continue);

  p.intro(continueMode ? t('sync.continue') : t('sync.title'));
  const projectDir = process.cwd();
  let binding = await readBinding(projectDir);
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

  if (drift.localEdited) {
    binding = await resolveReadOnlyModuleDrift(
      projectDir,
      binding,
      drift.dirtyPaths,
      Boolean(options.yes),
    );
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
