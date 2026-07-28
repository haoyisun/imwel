import * as p from '@clack/prompts';
import { adapters } from '../adapters/index.js';
import { discoverArtifacts } from '../core/artifacts.js';
import type { Artifact } from '../core/artifact-types.js';
import {
  readBinding,
  writeBinding,
  writableProjectName,
  type BoundProject,
} from '../core/binding.js';
import { applyInspectedRenderedFiles } from '../core/apply-files.js';
import { listRemotes } from '../core/config.js';
import {
  exitIfMissingFlags,
  isInteractiveStdin,
  parseCsv,
} from '../core/cli-flags.js';
import { error, info, success, warn } from '../core/cli-output.js';
import { ensureHistoryRepo, commitInstalledFiles } from '../core/history.js';
import { readManifest, resolveConventions, projectRole } from '../core/manifest.js';
import { inspectBindingRenderedFiles, overwriteRisks } from '../core/managed-write-safety.js';
import { printPathConflicts } from '../core/print-conflicts.js';
import { branchCommit, checkoutBranch, ensureRemoteCache, listBranches } from '../core/remote-cache.js';
import { renderArtifacts } from '../core/render.js';
import { selectWithDiffConfirm } from '../core/select-diff.js';
import { installCommandPackWithFeedback } from './skill.js';
import { confirmRenderedFileWrites, promptFinalWriteAction } from './write-safety.js';
import { runSync } from './sync.js';
import { t } from '../locales/index.js';

export interface InitOptions {
  yes?: boolean;
  tools?: string;
  remote?: string;
  branch?: string;
  /** Writable project (role: project); at most one. */
  project?: string;
  /** CSV of read-only modules (role: shared) to subscribe to. */
  module?: string;
  /** CSV of optional source paths, or `false` when `--no-optional` is set. */
  optional?: string | false;
  /** Install the first-party command pack; `false` when `--no-command-pack`. */
  commandPack?: boolean;
}

export interface InitSelectionState {
  tools: string[];
  remote: string;
  branch: string;
  modules: string[];
  writableProject: string | undefined;
  optionalArtifacts: string[];
}

export function initPromptInitialValues(
  current: InitSelectionState,
  revisiting: boolean,
  existing: Partial<InitSelectionState>,
): InitSelectionState {
  if (revisiting) {
    return current;
  }
  return {
    tools: existing.tools ?? current.tools,
    remote: existing.remote ?? current.remote,
    branch: existing.branch ?? current.branch,
    modules: existing.modules ?? current.modules,
    writableProject: existing.writableProject ?? current.writableProject,
    optionalArtifacts: existing.optionalArtifacts ?? current.optionalArtifacts,
  };
}

export async function runInitFinalOrchestration<R>(options: {
  prompt: () => Promise<'apply' | 'back' | 'cancel'>;
  reenterToolSelection: () => Promise<void>;
  apply: () => Promise<R>;
}): Promise<
  | { status: 'cancelled' }
  | { status: 'back' }
  | { status: 'applied'; result: R }
> {
  const action = await options.prompt();
  if (action === 'cancel') {
    return { status: 'cancelled' };
  }
  if (action === 'back') {
    await options.reenterToolSelection();
    return { status: 'back' };
  }
  return { status: 'applied', result: await options.apply() };
}

function hasSelectionFlags(opts: InitOptions): boolean {
  return Boolean(
    opts.tools ||
      opts.remote ||
      opts.branch ||
      opts.project ||
      opts.module ||
      opts.optional !== undefined,
  );
}

function useNonInteractiveSelections(opts: InitOptions): boolean {
  return !isInteractiveStdin() || Boolean(opts.yes) || hasSelectionFlags(opts);
}

export async function runInit(opts: InitOptions = {}): Promise<number> {
  p.intro(t('init.title'));
  const projectDir = process.cwd();
  const nonInteractive = useNonInteractiveSelections(opts);

  const remotes = await listRemotes();
  const remoteAliases = Object.keys(remotes);
  if (remoteAliases.length === 0) {
    error(t('init.noRemotes'));
    return 1;
  }
  const soleRemote = remoteAliases.length === 1 ? remoteAliases[0] : undefined;
  const effectiveRemote = opts.remote ?? soleRemote;

  if (nonInteractive) {
    const optionalStrategyMissing =
      opts.optional === undefined
        ? { '--optional/--no-optional': undefined as unknown }
        : {};
    const missing = exitIfMissingFlags({
      '--tools': opts.tools,
      '--remote': effectiveRemote,
      '--branch': opts.branch,
      ...optionalStrategyMissing,
    });
    if (missing !== null) {
      return missing;
    }
  }

  const existing = await readBinding(projectDir);
  let rebind = false;
  if (existing) {
    warn(
      t('init.alreadyBound', {
        remote: existing.remote,
        project: existing.projects.map((p2) => p2.name).join(', '),
      }),
      { target: 'stdout' },
    );
    if (opts.yes) {
      rebind = true;
    } else if (nonInteractive) {
      error(t('init.rebindRequiresYes'));
      return 1;
    } else {
      const confirm = await p.confirm({ message: t('init.rebindConfirm'), initialValue: false });
      if (p.isCancel(confirm) || !confirm) {
        info(t('common.cancelled'));
        return 1;
      }
      rebind = true;
    }
  }

  let tools: string[] = [];
  let remote = '';
  let branch = '';
  let moduleNames: string[] = [];
  let writableName: string | undefined;
  let optionalSet = new Set<string>();
  let optionalSelections: string[] = [];
  let revisiting = false;

  const existingModules = existing?.projects.filter((p2) => p2.mode === 'subscribed').map((p2) => p2.name) ?? [];
  const existingWritable = existing ? writableProjectName(existing) : undefined;
  let prepared:
    | {
        warningLocaleKeys: string[];
        writtenPaths: string[];
      }
    | undefined;

  while (!prepared) {
    const initial = initPromptInitialValues(
      {
        tools,
        remote,
        branch,
        modules: moduleNames,
        writableProject: writableName,
        optionalArtifacts: optionalSelections,
      },
      revisiting,
      {
        tools: existing?.tools,
        remote: existing?.remote,
        branch: existing?.branch,
        modules: existingModules,
        writableProject: existingWritable,
      },
    );

    if (nonInteractive) {
      tools = parseCsv(opts.tools);
      const supported = new Set(adapters.map((a) => a.id));
      const unknown = tools.filter((id) => !supported.has(id));
      if (tools.length === 0 || unknown.length > 0) {
        error(
          t('init.unknownTools', {
            tools: unknown.join(', ') || '(empty)',
            supported: [...supported].join(', '),
          }),
        );
        return 1;
      }
      remote = effectiveRemote!;
      if (!remoteAliases.includes(remote)) {
        error(t('init.unknownRemote', { alias: remote }));
        return 1;
      }
      branch = opts.branch!;
      moduleNames = parseCsv(opts.module);
      const writableList = parseCsv(opts.project);
      if (writableList.length > 1) {
        error(t('init.tooManyWritable', { projects: writableList.join(', ') }));
        return 1;
      }
      writableName = writableList[0];
      if (opts.optional !== false) {
        optionalSet = new Set(parseCsv(opts.optional as string));
      }
    } else {
      const detected = await Promise.all(
        adapters.map(async (adapter) => ({
          value: adapter.id,
          label: t(`tool.${adapter.id}` as 'tool.cursor'),
          detected: await adapter.detect(projectDir),
        })),
      );
      const toolResult = await selectWithDiffConfirm({
        message: t('init.prompt.tools'),
        items: detected.map((d) => ({ value: d.value, label: d.label })),
        installed: initial.tools,
        required: true,
      });
      if (!toolResult || toolResult.selected.length === 0) {
        error(t('init.noTools'));
        return 1;
      }
      tools = toolResult.selected;

      if (soleRemote) {
        remote = soleRemote;
        info(t('init.autoRemote', { alias: soleRemote }));
      } else {
        const selectedRemote = (await p.select({
          message: t('init.prompt.remote'),
          options: remoteAliases.map((alias) => ({ value: alias, label: alias })),
          initialValue: initial.remote || remoteAliases[0],
        })) as string;
        if (p.isCancel(selectedRemote)) {
          info(t('common.cancelled'));
          return 1;
        }
        remote = selectedRemote;
      }
    }

    const spinner = p.spinner();
    spinner.start(t('init.fetching', { alias: remote }));
    const cacheDir = await ensureRemoteCache(remote, { force: true });
    spinner.stop(t('common.done'));

    const branches = await listBranches(cacheDir);
    if (nonInteractive) {
      if (!branches.includes(branch)) {
        error(t('init.unknownBranch', { branch }));
        return 1;
      }
    } else {
      const selectedBranch = (await p.select({
        message: t('init.prompt.branch'),
        options: branches.map((b) => ({ value: b, label: b })),
        initialValue: branches.includes(initial.branch) ? initial.branch : branches[0],
      })) as string;
      if (p.isCancel(selectedBranch)) {
        info(t('common.cancelled'));
        return 1;
      }
      branch = selectedBranch;
    }

    await checkoutBranch(cacheDir, branch);
    const commit = await branchCommit(cacheDir, branch);
    const manifest = await readManifest(cacheDir);
    const sharedProjects = manifest.projects.filter((proj) => projectRole(proj) === 'shared');
    const writableProjects = manifest.projects.filter((proj) => projectRole(proj) === 'project');

    if (nonInteractive) {
      for (const name of moduleNames) {
        if (!sharedProjects.some((proj) => proj.name === name)) {
          error(t('init.unknownModule', { module: name }));
          return 1;
        }
      }
      if (writableName !== undefined) {
        const found = manifest.projects.find((proj) => proj.name === writableName);
        if (!found) {
          error(t('init.unknownProject', { project: writableName }));
          return 1;
        }
        if (projectRole(found) !== 'project') {
          error(t('init.notWritable', { project: writableName }));
          return 1;
        }
      }
    } else {
      const orderedModules = [
        ...initial.modules.filter((name) => sharedProjects.some((proj) => proj.name === name)),
        ...sharedProjects.map((proj) => proj.name).filter((name) => !initial.modules.includes(name)),
      ];
      if (orderedModules.length > 0) {
        const moduleResult = await selectWithDiffConfirm({
          message: t('init.prompt.modules'),
          items: orderedModules.map((name) => ({ value: name, label: name })),
          installed: initial.modules.filter((name) => orderedModules.includes(name)),
        });
        if (!moduleResult) {
          info(t('common.cancelled'));
          return 1;
        }
        moduleNames = moduleResult.selected;
      } else {
        moduleNames = [];
      }

      if (writableProjects.length > 0) {
        const noneValue = '\u0000none';
        const initialWritable =
          initial.writableProject &&
          writableProjects.some((project) => project.name === initial.writableProject)
            ? initial.writableProject
            : noneValue;
        const selectedWritable = (await p.select({
          message: t('init.prompt.project'),
          options: [
            { value: noneValue, label: t('init.prompt.project.none') },
            ...writableProjects.map((proj) => ({ value: proj.name, label: proj.name })),
          ],
          initialValue: initialWritable,
        })) as string;
        if (p.isCancel(selectedWritable)) {
          info(t('common.cancelled'));
          return 1;
        }
        writableName = selectedWritable === noneValue ? undefined : selectedWritable;
      } else {
        writableName = undefined;
      }
    }

    const selectedProjectNames = [...moduleNames];
    if (writableName) {
      selectedProjectNames.push(writableName);
    }
    if (selectedProjectNames.length === 0) {
      error(t('init.noSelection'));
      return 1;
    }

    const boundProjects: BoundProject[] = [
      ...moduleNames.map((name) => ({ name, mode: 'subscribed' as const })),
      ...(writableName ? [{ name: writableName, mode: 'linked' as const }] : []),
    ];
    let allArtifacts: Artifact[] = [];
    for (const name of selectedProjectNames) {
      const { project, conventions } = resolveConventions(manifest, name);
      allArtifacts = allArtifacts.concat(await discoverArtifacts(cacheDir, project, conventions));
    }
    const optionalArtifacts = allArtifacts.filter((artifact) => artifact.optional);

    if (!nonInteractive && optionalArtifacts.length > 0) {
      const availableOptional = new Set(
        optionalArtifacts.map((artifact) => `${artifact.project}\u0000${artifact.sourcePath}`),
      );
      const selected = (await p.multiselect({
        message: t('init.prompt.optional'),
        options: optionalArtifacts.map((artifact) => ({
          value: `${artifact.project}\u0000${artifact.sourcePath}`,
          label: `${artifact.project} · ${artifact.sourcePath}`,
        })),
        initialValues: initial.optionalArtifacts.filter((value) => availableOptional.has(value)),
      })) as string[];
      if (p.isCancel(selected)) {
        info(t('common.cancelled'));
        return 1;
      }
      optionalSelections = selected;
      optionalSet = new Set(selected.map((value) => value.split('\u0000')[1]!));
    }

    const artifacts = allArtifacts.filter(
      (artifact) => !artifact.optional || optionalSet.has(artifact.sourcePath),
    );
    const { files, managed, conflicts, warningLocaleKeys } = renderArtifacts(artifacts, tools);
    if (conflicts.length) {
      printPathConflicts(conflicts);
      return 1;
    }
    const inspectedFiles = await inspectBindingRenderedFiles(projectDir, files, existing);

    let promptFinalAction: () => Promise<'apply' | 'back' | 'cancel'>;
    if (nonInteractive) {
      if (!(await confirmRenderedFileWrites(inspectedFiles, Boolean(opts.yes)))) {
        info(t('common.cancelled'));
        return 1;
      }
      promptFinalAction = async () => 'apply';
    } else {
      await confirmRenderedFileWrites(inspectedFiles, true);
      const risks = overwriteRisks(inspectedFiles);
      const message =
        risks.length > 0
          ? t('writeSafety.confirm', {
              count: risks.length,
              paths: risks.map((file) => file.path).join(', '),
            })
          : t('init.confirm', { count: inspectedFiles.length });
      promptFinalAction = () => promptFinalWriteAction(message);
    }

    const final = await runInitFinalOrchestration({
      prompt: promptFinalAction,
      reenterToolSelection: async () => {
        revisiting = true;
      },
      apply: async () => {
        await applyInspectedRenderedFiles(projectDir, inspectedFiles);
        await ensureHistoryRepo(projectDir);
        const writtenPaths = files.map((file) => file.path);
        const historyCommit = await commitInstalledFiles(projectDir, writtenPaths, 'imwel init');
        await writeBinding(projectDir, {
          remote,
          branch,
          projects: boundProjects,
          tools,
          lastSyncedCommit: commit,
          lastSyncedHistoryCommit: historyCommit,
          artifacts: managed,
        });
        return { warningLocaleKeys, writtenPaths };
      },
    });
    if (final.status === 'cancelled') {
      info(t('common.cancelled'));
      return 1;
    }
    if (final.status === 'back') {
      continue;
    }

    prepared = final.result;
  }

  const { warningLocaleKeys, writtenPaths } = prepared;
  for (const key of warningLocaleKeys) {
    warn(t(key as 'adapter.skill.r4Warning'));
  }
  if (
    tools.includes('codex') &&
    writtenPaths.some((p) => p.replace(/\\/g, '/').includes('.agents/skills/'))
  ) {
    info(t('adapter.codex.skillsHint'));
  }
  if (writableName) {
    success(t('init.success', { project: writableName, branch }));
  } else {
    success(t('init.successModulesOnly', { modules: moduleNames.join(', '), branch }));
  }

  await maybeInstallCommandPack(projectDir, tools, opts, nonInteractive);

  if (rebind && !nonInteractive && !opts.yes) {
    const syncNow = await p.confirm({ message: t('init.prompt.syncNow'), initialValue: true });
    if (!p.isCancel(syncNow) && syncNow) {
      return runSync({ continue: false });
    }
  }
  p.outro(t('common.done'));
  return 0;
}

/**
 * Opt-in install of the first-party command pack after a successful bind. This
 * step never affects the binding result: any failure is reported with an
 * actionable "install later" hint and swallowed.
 */
async function maybeInstallCommandPack(
  projectDir: string,
  tools: string[],
  opts: InitOptions,
  nonInteractive: boolean,
): Promise<void> {
  if (opts.commandPack === false) {
    return;
  }
  let shouldInstall: boolean;
  if (nonInteractive) {
    shouldInstall = opts.commandPack === true;
  } else if (opts.commandPack === true) {
    shouldInstall = true;
  } else {
    const confirm = await p.confirm({
      message: t('init.prompt.commandPack', { tools: tools.join(', ') }),
      initialValue: true,
    });
    shouldInstall = !p.isCancel(confirm) && confirm;
  }
  if (!shouldInstall) {
    info(t('init.commandPack.skipped'));
    return;
  }
  try {
    await installCommandPackWithFeedback(projectDir, tools, { yes: true, confirm: false });
  } catch (error) {
    warn(t('init.commandPack.failed', { error: error instanceof Error ? error.message : String(error) }));
  }
}
