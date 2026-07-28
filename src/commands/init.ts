import * as p from '@clack/prompts';
import { adapters } from '../adapters/index.js';
import { discoverArtifacts } from '../core/artifacts.js';
import type { Artifact } from '../core/artifact-types.js';
import { readBinding, writeBinding, writableProjectName, type BoundProject } from '../core/binding.js';
import { applyInspectedRenderedFiles } from '../core/apply-files.js';
import { listRemotes } from '../core/config.js';
import {
  exitIfMissingFlags,
  isInteractiveStdin,
  parseCsv,
} from '../core/cli-flags.js';
import { ensureHistoryRepo, commitInstalledFiles } from '../core/history.js';
import { readManifest, resolveConventions, projectRole } from '../core/manifest.js';
import { inspectBindingRenderedFiles } from '../core/managed-write-safety.js';
import { printPathConflicts } from '../core/print-conflicts.js';
import { branchCommit, checkoutBranch, ensureRemoteCache, listBranches } from '../core/remote-cache.js';
import { renderArtifacts } from '../core/render.js';
import { selectWithDiffConfirm } from '../core/select-diff.js';
import { installCommandPackWithFeedback } from './skill.js';
import { confirmRenderedFileWrites } from './write-safety.js';
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
    console.error(t('init.noRemotes'));
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
    console.log(
      t('init.alreadyBound', {
        remote: existing.remote,
        project: existing.projects.map((p2) => p2.name).join(', '),
      }),
    );
    if (opts.yes) {
      rebind = true;
    } else if (nonInteractive) {
      console.error(t('init.rebindRequiresYes'));
      return 1;
    } else {
      const confirm = await p.confirm({ message: t('init.rebindConfirm'), initialValue: false });
      if (p.isCancel(confirm) || !confirm) {
        console.log(t('common.cancelled'));
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

  const existingModules = existing?.projects.filter((p2) => p2.mode === 'subscribed').map((p2) => p2.name) ?? [];
  const existingWritable = existing ? writableProjectName(existing) : undefined;

  if (nonInteractive) {
    tools = parseCsv(opts.tools);
    const supported = new Set(adapters.map((a) => a.id));
    const unknown = tools.filter((id) => !supported.has(id));
    if (tools.length === 0 || unknown.length > 0) {
      console.error(
        t('init.unknownTools', {
          tools: unknown.join(', ') || '(empty)',
          supported: [...supported].join(', '),
        }),
      );
      return 1;
    }
    remote = effectiveRemote!;
    if (!remoteAliases.includes(remote)) {
      console.error(t('init.unknownRemote', { alias: remote }));
      return 1;
    }
    branch = opts.branch!;
    moduleNames = parseCsv(opts.module);
    const writableList = parseCsv(opts.project);
    if (writableList.length > 1) {
      console.error(t('init.tooManyWritable', { projects: writableList.join(', ') }));
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
      installed: existing?.tools ?? [],
      required: true,
    });
    if (!toolResult || toolResult.selected.length === 0) {
      console.error(t('init.noTools'));
      return 1;
    }
    tools = toolResult.selected;

    if (soleRemote) {
      remote = soleRemote;
      console.log(t('init.autoRemote', { alias: soleRemote }));
    } else {
      const selectedRemote = (await p.select({
        message: t('init.prompt.remote'),
        options: remoteAliases.map((alias) => ({ value: alias, label: alias })),
        initialValue: existing?.remote,
      })) as string;
      if (p.isCancel(selectedRemote)) {
        console.log(t('common.cancelled'));
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
      console.error(t('init.unknownBranch', { branch }));
      return 1;
    }
  } else {
    const selectedBranch = (await p.select({
      message: t('init.prompt.branch'),
      options: branches.map((b) => ({ value: b, label: b })),
      initialValue: existing?.branch ?? branches[0],
    })) as string;
    if (p.isCancel(selectedBranch)) {
      console.log(t('common.cancelled'));
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
        console.error(t('init.unknownModule', { module: name }));
        return 1;
      }
    }
    if (writableName !== undefined) {
      const found = manifest.projects.find((proj) => proj.name === writableName);
      if (!found) {
        console.error(t('init.unknownProject', { project: writableName }));
        return 1;
      }
      if (projectRole(found) !== 'project') {
        console.error(t('init.notWritable', { project: writableName }));
        return 1;
      }
    }
  } else {
    // Modules (read-only), then the single writable project.
    const orderedModules = [
      ...existingModules.filter((n) => sharedProjects.some((proj) => proj.name === n)),
      ...sharedProjects.map((proj) => proj.name).filter((n) => !existingModules.includes(n)),
    ];
    if (orderedModules.length > 0) {
      const moduleResult = await selectWithDiffConfirm({
        message: t('init.prompt.modules'),
        items: orderedModules.map((name) => ({ value: name, label: name })),
        installed: existingModules,
      });
      if (!moduleResult) {
        console.log(t('common.cancelled'));
        return 1;
      }
      moduleNames = moduleResult.selected;
    }

    if (writableProjects.length > 0) {
      const noneValue = '\u0000none';
      const selectedWritable = (await p.select({
        message: t('init.prompt.project'),
        options: [
          { value: noneValue, label: t('init.prompt.project.none') },
          ...writableProjects.map((proj) => ({ value: proj.name, label: proj.name })),
        ],
        initialValue: existingWritable ?? noneValue,
      })) as string;
      if (p.isCancel(selectedWritable)) {
        console.log(t('common.cancelled'));
        return 1;
      }
      writableName = selectedWritable === noneValue ? undefined : selectedWritable;
    }
  }

  const selectedProjectNames = [...moduleNames];
  if (writableName) {
    selectedProjectNames.push(writableName);
  }
  if (selectedProjectNames.length === 0) {
    console.error(t('init.noSelection'));
    return 1;
  }

  // Discover artifacts for every selected project (tagged with its project name).
  const boundProjects: BoundProject[] = [
    ...moduleNames.map((name) => ({ name, mode: 'subscribed' as const })),
    ...(writableName ? [{ name: writableName, mode: 'linked' as const }] : []),
  ];

  let allArtifacts: Artifact[] = [];
  for (const name of selectedProjectNames) {
    const { project, conventions } = resolveConventions(manifest, name);
    allArtifacts = allArtifacts.concat(await discoverArtifacts(cacheDir, project, conventions));
  }
  const optionalArtifacts = allArtifacts.filter((a) => a.optional);

  if (!nonInteractive && optionalArtifacts.length > 0) {
    const selected = (await p.multiselect({
      message: t('init.prompt.optional'),
      options: optionalArtifacts.map((a) => ({
        value: `${a.project}\u0000${a.sourcePath}`,
        label: `${a.project} · ${a.sourcePath}`,
      })),
    })) as string[];
    if (!p.isCancel(selected)) {
      optionalSet = new Set(selected.map((v) => v.split('\u0000')[1]!));
    }
  }

  const artifacts = allArtifacts.filter(
    (a) => !a.optional || optionalSet.has(a.sourcePath),
  );
  const { files, managed, conflicts, warningLocaleKeys } = renderArtifacts(artifacts, tools);
  if (conflicts.length) {
    printPathConflicts(conflicts);
    return 1;
  }
  const inspectedFiles = await inspectBindingRenderedFiles(projectDir, files, existing);
  if (!(await confirmRenderedFileWrites(inspectedFiles, Boolean(opts.yes)))) {
    console.log(t('common.cancelled'));
    return 1;
  }
  await applyInspectedRenderedFiles(projectDir, inspectedFiles);
  await ensureHistoryRepo(projectDir);
  const writtenPaths = files.map((f) => f.path);
  const historyCommit = await commitInstalledFiles(projectDir, writtenPaths, 'imwel init');

  const binding = {
    remote,
    branch,
    projects: boundProjects,
    tools,
    lastSyncedCommit: commit,
    lastSyncedHistoryCommit: historyCommit,
    artifacts: managed,
  };
  await writeBinding(projectDir, binding);
  for (const key of warningLocaleKeys) {
    console.warn(t(key as 'adapter.skill.r4Warning'));
  }
  if (
    tools.includes('codex') &&
    writtenPaths.some((p) => p.replace(/\\/g, '/').includes('.agents/skills/'))
  ) {
    console.log(t('adapter.codex.skillsHint'));
  }
  if (writableName) {
    console.log(t('init.success', { project: writableName, branch }));
  } else {
    console.log(t('init.successModulesOnly', { modules: moduleNames.join(', '), branch }));
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
    console.log(t('init.commandPack.skipped'));
    return;
  }
  try {
    await installCommandPackWithFeedback(projectDir, tools, { yes: true, confirm: false });
  } catch (error) {
    console.warn(t('init.commandPack.failed', { error: error instanceof Error ? error.message : String(error) }));
  }
}
