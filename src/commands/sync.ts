import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import { readBinding, writeBinding, type Binding, type BoundProject } from '../core/binding.js';
import { computeDrift } from '../core/drift.js';
import { isInteractiveStdin } from '../core/cli-flags.js';
import { error, info, success, warn } from '../core/cli-output.js';
import { remoteCacheDir } from '../core/paths.js';
import { checkoutBranch, ensureRemoteCache } from '../core/remote-cache.js';
import { findMissingManagedFiles, planSync, writeSyncResults } from '../core/sync-engine.js';
import { pathExists } from '../core/fs-utils.js';
import { pendingSyncPath } from '../core/paths.js';
import { printPathConflicts } from '../core/print-conflicts.js';
import { t } from '../locales/index.js';
import type { LocaleKey } from '../locales/en.js';
import {
  graduateProjectContributions,
  readPendingProposals,
  refreshProposalBaselinesAfterSync,
  writePendingProposals,
} from '../core/propose.js';
import { promptFinalWriteAction } from './write-safety.js';

export type ModuleDriftChoice = 'discard' | 'freeze' | 'uninstall';
type ModuleDriftPromptResult = ModuleDriftChoice | 'cancel';

type SelectPrompt = (options: {
  message: string;
  options: Array<{ value: ModuleDriftChoice; label: string }>;
  initialValue: ModuleDriftChoice;
}) => Promise<unknown>;

export async function promptModuleDriftChoice(
  module: string,
  editedPaths: string[],
  initialValue: ModuleDriftChoice,
  select: SelectPrompt = p.select,
): Promise<ModuleDriftPromptResult> {
  const selected = await select({
    message: t('sync.moduleDrift.prompt', {
      module,
      paths: editedPaths.join(', '),
    }),
    options: [
      { value: 'discard', label: t('sync.moduleDrift.discard') },
      { value: 'freeze', label: t('sync.moduleDrift.freeze') },
      { value: 'uninstall', label: t('sync.moduleDrift.uninstall') },
    ],
    initialValue,
  });
  if (p.isCancel(selected) || selected === 'cancel') {
    return 'cancel';
  }
  return selected as ModuleDriftChoice;
}

export interface InteractiveModuleDriftPlan {
  binding: Binding;
  choices: Map<string, ModuleDriftChoice>;
  removals: Array<{ module: string; paths: string[]; choice: 'discard' | 'uninstall' }>;
}

export async function planInteractiveModuleDrift(
  binding: Binding,
  dirtyPaths: string[],
  priorChoices: Map<string, ModuleDriftChoice>,
  prompt: typeof promptModuleDriftChoice = promptModuleDriftChoice,
): Promise<InteractiveModuleDriftPlan | null> {
  const dirty = new Set(dirtyPaths);
  const choices = new Map(priorChoices);
  let projects: BoundProject[] = binding.projects;
  let artifacts = binding.artifacts;
  const removals: InteractiveModuleDriftPlan['removals'] = [];

  for (const bound of binding.projects.filter(
    (project) => project.mode === 'subscribed' && !project.frozen,
  )) {
    const moduleArtifacts = binding.artifacts.filter((artifact) => artifact.project === bound.name);
    const modulePaths = moduleArtifacts.flatMap((artifact) =>
      Object.values(artifact.installedPaths).flat(),
    );
    const editedPaths = modulePaths.filter((relativePath) => dirty.has(relativePath));
    if (editedPaths.length === 0) {
      continue;
    }

    const choice = await prompt(
      bound.name,
      editedPaths,
      choices.get(bound.name) ?? 'freeze',
    );
    if (choice === 'cancel') {
      return null;
    }
    choices.set(bound.name, choice);
    if (choice === 'freeze') {
      projects = projects.map((project) =>
        project.name === bound.name ? { ...project, frozen: true } : project,
      );
    } else if (choice === 'uninstall') {
      projects = projects.filter((project) => project.name !== bound.name);
      artifacts = artifacts.filter((artifact) => artifact.project !== bound.name);
      removals.push({ module: bound.name, paths: modulePaths, choice });
    } else {
      removals.push({ module: bound.name, paths: editedPaths, choice });
    }
  }

  return { binding: { ...binding, projects, artifacts }, choices, removals };
}

export async function applyInteractiveModuleDrift(
  projectDir: string,
  plan: InteractiveModuleDriftPlan,
): Promise<void> {
  for (const removal of plan.removals) {
    for (const relativePath of removal.paths) {
      await fs.rm(path.join(projectDir, relativePath), { force: true });
    }
    info(
      t(
        removal.choice === 'discard'
          ? 'sync.moduleDrift.discarded'
          : 'sync.moduleDrift.uninstalled',
        { module: removal.module },
      ),
    );
  }
  for (const [module, choice] of plan.choices) {
    if (choice === 'freeze') {
      info(t('sync.moduleDrift.frozen', { module }));
    }
  }
}

async function graduateContributions(projectDir: string, binding: Binding): Promise<number> {
  const proposals = await readPendingProposals(projectDir);
  const remaining = graduateProjectContributions(proposals, binding.remote, binding.artifacts);
  const graduated = proposals.length - remaining.length;
  const refreshed = refreshProposalBaselinesAfterSync(remaining, binding.remote, {
    baseBranch: binding.branch,
    baseCommit: binding.lastSyncedCommit,
  });
  const baselinesChanged = refreshed.some(
    (proposal, index) =>
      proposal.baseCommit !== remaining[index]?.baseCommit ||
      proposal.baseBranch !== remaining[index]?.baseBranch,
  );
  if (graduated > 0 || baselinesChanged) {
    await writePendingProposals(projectDir, refreshed);
  }
  if (graduated > 0) {
    info(t('sync.graduated', { count: graduated }));
  }
  return graduated;
}

function printRenderSideEffects(
  warningLocaleKeys: string[],
  tools: string[],
  writtenPaths: string[],
): void {
  for (const key of warningLocaleKeys) {
    warn(t(key as LocaleKey));
  }
  if (
    tools.includes('codex') &&
    writtenPaths.some((p) => p.replace(/\\/g, '/').includes('.agents/skills/'))
  ) {
    info(t('adapter.codex.skillsHint'));
  }
}

export interface SyncOptions {
  yes?: boolean;
  continue?: boolean;
}

export interface GuidedSyncRound<T> {
  prepared: T;
  choices: Map<string, ModuleDriftChoice>;
  selectionCount: number;
}

export async function runGuidedSyncOrchestration<T, R>(options: {
  prepare: (
    priorChoices: Map<string, ModuleDriftChoice>,
  ) => Promise<GuidedSyncRound<T> | null>;
  prompt: (prepared: T, allowBack: boolean) => Promise<'apply' | 'back' | 'cancel'>;
  apply: (prepared: T) => Promise<R>;
}): Promise<{ status: 'cancelled' } | { status: 'applied'; result: R }> {
  let priorChoices = new Map<string, ModuleDriftChoice>();
  while (true) {
    const round = await options.prepare(priorChoices);
    if (!round) {
      return { status: 'cancelled' };
    }
    priorChoices = round.choices;

    const action = await options.prompt(round.prepared, round.selectionCount > 0);
    if (action === 'cancel') {
      return { status: 'cancelled' };
    }
    if (action === 'back') {
      continue;
    }
    return { status: 'applied', result: await options.apply(round.prepared) };
  }
}

export async function runSyncInteractionMode<R>(
  guidedInteractive: boolean,
  guided: () => Promise<R>,
  standard: () => Promise<R>,
): Promise<R> {
  return guidedInteractive ? guided() : standard();
}

export async function authorizeSyncChanges(
  yes: boolean,
  interactive: boolean,
  confirm: () => Promise<boolean>,
): Promise<boolean> {
  if (yes) {
    return true;
  }
  if (!interactive) {
    return false;
  }
  return confirm();
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
    let choice: ModuleDriftChoice = 'freeze';
    if (!yes && isInteractiveStdin()) {
      const selected = await promptModuleDriftChoice(bound.name, editedPaths, 'freeze');
      if (selected === 'cancel') {
        info(t('common.cancelled'));
        continue;
      }
      choice = selected;
    }

    if (choice === 'discard') {
      // Delete local edits so the normal sync rewrites them from upstream.
      for (const rel of editedPaths) {
        await fs.rm(path.join(projectDir, rel), { force: true });
      }
      info(t('sync.moduleDrift.discarded', { module: bound.name }));
    } else if (choice === 'freeze') {
      projects = projects.map((bp) =>
        bp.name === bound.name ? { ...bp, frozen: true } : bp,
      );
      info(t('sync.moduleDrift.frozen', { module: bound.name }));
    } else {
      for (const rel of modulePaths) {
        await fs.rm(path.join(projectDir, rel), { force: true });
      }
      projects = projects.filter((bp) => bp.name !== bound.name);
      artifacts = artifacts.filter((a) => a.project !== bound.name);
      info(t('sync.moduleDrift.uninstalled', { module: bound.name }));
    }
  }

  if (projects === binding.projects && artifacts === binding.artifacts) {
    return binding;
  }
  const next: Binding = { ...binding, projects, artifacts };
  await writeBinding(projectDir, next);
  return next;
}

interface PreparedSync {
  binding: Binding;
  plan: Awaited<ReturnType<typeof planSync>>;
  moduleDrift?: InteractiveModuleDriftPlan;
}

async function applyPreparedSync(
  projectDir: string,
  prepared: PreparedSync,
): Promise<number> {
  const binding = prepared.binding;
  if (prepared.moduleDrift) {
    await applyInteractiveModuleDrift(projectDir, prepared.moduleDrift);
  }
  const result = await writeSyncResults(
    projectDir,
    binding,
    prepared.plan,
    binding.tools,
    false,
  );
  if (result.skippedWrite && result.pathConflicts?.length) {
    printPathConflicts(result.pathConflicts);
    return 1;
  }
  if (result.hasConflicts) {
    const pending = await import('../core/yaml-file.js').then((m) =>
      m.readYamlFile<{ conflictPaths: string[] }>(pendingSyncPath(projectDir)),
    );
    error(t('sync.conflicts', { paths: (pending?.conflictPaths ?? []).join(', ') }));
    return 1;
  }
  await writeBinding(projectDir, result.binding);
  await graduateContributions(projectDir, result.binding);
  printRenderSideEffects(
    result.warningLocaleKeys ?? [],
    binding.tools,
    result.writtenPaths ?? [],
  );
  success(t('sync.success', { sha: result.binding.lastSyncedCommit }));
  p.outro(t('common.done'));
  return 0;
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
    error(t('sync.noBinding'));
    return 1;
  }

  const spinner = p.spinner();
  spinner.start(t('sync.fetching', { alias: binding.remote }));
  const cacheDir = await ensureRemoteCache(binding.remote, { force: true });
  await checkoutBranch(cacheDir, binding.branch);
  spinner.stop(t('common.done'));

  if (continueMode) {
    if (!(await pathExists(pendingSyncPath(projectDir)))) {
      error(t('sync.pendingNone'));
      return 1;
    }
    const plan = await planSync(cacheDir, binding);
    const result = await writeSyncResults(projectDir, binding, plan, binding.tools, true);
    await writeBinding(projectDir, result.binding);
    await graduateContributions(projectDir, result.binding);
    success(t('sync.success', { sha: result.binding.lastSyncedCommit }));
    p.outro(t('common.done'));
    return 0;
  }

  const drift = await computeDrift(projectDir, binding, cacheDir, true);
  const missingManaged = await findMissingManagedFiles(projectDir, binding);
  if (!drift.remoteUpdated && !drift.localEdited && missingManaged.length === 0) {
    await graduateContributions(projectDir, binding);
    success(t('sync.upToDate'));
    p.outro(t('common.done'));
    return 0;
  }

  const missingPaths = new Set(missingManaged.map((item) => item.path.replace(/\\/g, '/')));
  const editedPaths = drift.dirtyPaths.filter(
    (dirtyPath) => !missingPaths.has(dirtyPath.replace(/\\/g, '/')),
  );
  const interactive = isInteractiveStdin();
  const guidedInteractive = interactive && !options.yes;
  if (editedPaths.length > 0 && !guidedInteractive) {
    binding = await resolveReadOnlyModuleDrift(
      projectDir,
      binding,
      editedPaths,
      Boolean(options.yes),
    );
  }

  const prepareSync = async (
    priorChoices: Map<string, ModuleDriftChoice>,
  ): Promise<GuidedSyncRound<PreparedSync> | null> => {
    let selectedBinding = binding;
    let moduleDrift: InteractiveModuleDriftPlan | undefined;
    if (guidedInteractive && editedPaths.length > 0) {
      const plannedDrift = await planInteractiveModuleDrift(binding, editedPaths, priorChoices);
      if (!plannedDrift) {
        return null;
      }
      moduleDrift = plannedDrift;
      selectedBinding = plannedDrift.binding;
    }
    const plan = await planSync(cacheDir, selectedBinding, undefined, projectDir);
    const selectionCount = moduleDrift?.choices.size ?? 0;
    return {
      prepared: { binding: selectedBinding, plan, moduleDrift },
      choices: moduleDrift?.choices ?? new Map(),
      selectionCount,
    };
  };

  const printPreparedPlan = (round: GuidedSyncRound<PreparedSync>): void => {
    info(t('sync.plan.title'));
    for (const item of round.prepared.plan.items) {
      const key =
        item.status === 'added'
          ? 'sync.plan.added'
          : item.status === 'removed'
            ? 'sync.plan.removed'
            : 'sync.plan.modified';
      info(t(key, { path: item.sourcePath }));
    }
    for (const item of round.prepared.plan.restorations) {
      info(t('sync.plan.restore', { path: item.path, project: item.project }));
    }
  };

  return runSyncInteractionMode(
    guidedInteractive,
    async () => {
      let firstRound = await prepareSync(new Map());
      if (!firstRound) {
        info(t('common.cancelled'));
        return 1;
      }
      if (
        firstRound.prepared.plan.items.length === 0 &&
        firstRound.prepared.plan.restorations.length === 0 &&
        !drift.remoteUpdated &&
        firstRound.selectionCount === 0
      ) {
        await graduateContributions(projectDir, firstRound.prepared.binding);
        success(t('sync.upToDate'));
        return 0;
      }
      const outcome = await runGuidedSyncOrchestration({
        prepare: async (priorChoices) => {
          const round = firstRound ?? (await prepareSync(priorChoices));
          firstRound = null;
          if (round) {
            printPreparedPlan(round);
          }
          return round;
        },
        prompt: async (prepared, allowBack) => {
          const selectionCount = prepared.moduleDrift?.choices.size ?? 0;
          const count =
            prepared.plan.items.length +
              prepared.plan.restorations.length +
              selectionCount || prepared.plan.artifacts.length;
          return promptFinalWriteAction(t('sync.confirm', { count }), undefined, allowBack);
        },
        apply: (prepared) => applyPreparedSync(projectDir, prepared),
      });
      if (outcome.status === 'cancelled') {
        info(t('common.cancelled'));
        return 1;
      }
      return outcome.result;
    },
    async () => {
      const round = await prepareSync(new Map());
      if (!round) {
        info(t('common.cancelled'));
        return 1;
      }
      if (
        round.prepared.plan.items.length === 0 &&
        round.prepared.plan.restorations.length === 0 &&
        !drift.remoteUpdated
      ) {
        await graduateContributions(projectDir, round.prepared.binding);
        success(t('sync.upToDate'));
        return 0;
      }
      printPreparedPlan(round);
      const count =
        round.prepared.plan.items.length +
          round.prepared.plan.restorations.length +
          round.selectionCount || round.prepared.plan.artifacts.length;
      const authorized = await authorizeSyncChanges(
        Boolean(options.yes),
        interactive,
        async () => {
          const confirm = await p.confirm({
            message: t('sync.confirm', { count }),
            initialValue: true,
          });
          return !p.isCancel(confirm) && confirm;
        },
      );
      if (!authorized) {
        if (!interactive) {
          error(t('cli.nonInteractiveConfirmRequired'));
        } else {
          info(t('common.cancelled'));
        }
        return 1;
      }
      return applyPreparedSync(projectDir, round.prepared);
    },
  );
}
