import * as p from '@clack/prompts';
import { adapters } from '../adapters/index.js';
import { discoverArtifacts } from '../core/artifacts.js';
import { readBinding, writeBinding } from '../core/binding.js';
import { applyRenderedFiles } from '../core/apply-files.js';
import { listRemotes } from '../core/config.js';
import {
  exitIfMissingFlags,
  isInteractiveStdin,
  parseCsv,
} from '../core/cli-flags.js';
import { ensureHistoryRepo, commitInstalledFiles } from '../core/history.js';
import { readManifest } from '../core/manifest.js';
import { branchCommit, checkoutBranch, ensureRemoteCache, listBranches } from '../core/remote-cache.js';
import { renderArtifacts } from '../core/render.js';
import { runSync } from './sync.js';
import { t } from '../locales/index.js';

export interface InitOptions {
  yes?: boolean;
  tools?: string;
  remote?: string;
  branch?: string;
  project?: string;
  /** CSV of optional source paths, or `false` when `--no-optional` is set. */
  optional?: string | false;
}

function hasSelectionFlags(opts: InitOptions): boolean {
  return Boolean(
    opts.tools ||
      opts.remote ||
      opts.branch ||
      opts.project ||
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
  // When exactly one remote is configured, select it by default so callers
  // don't have to pass --remote (or pick from a one-item list).
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
      '--project': opts.project,
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
      t('init.alreadyBound', { remote: existing.remote, project: existing.project }),
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
  let project = '';
  let optionalSet = new Set<string>();

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
    project = opts.project!;
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
    const selectedTools = (await p.multiselect({
      message: t('init.prompt.tools'),
      options: detected.map((d) => ({
        value: d.value,
        label: d.label + (d.detected ? '' : ''),
      })),
      required: true,
    })) as string[];
    if (p.isCancel(selectedTools) || selectedTools.length === 0) {
      console.error(t('init.noTools'));
      return 1;
    }
    tools = selectedTools;

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

  if (nonInteractive) {
    if (!manifest.projects.some((proj) => proj.name === project)) {
      console.error(t('init.unknownProject', { project }));
      return 1;
    }
  } else {
    const selectedProject = (await p.select({
      message: t('init.prompt.project'),
      options: manifest.projects.map((proj) => ({ value: proj.name, label: proj.name })),
      initialValue: existing?.project,
    })) as string;
    if (p.isCancel(selectedProject)) {
      console.log(t('common.cancelled'));
      return 1;
    }
    project = selectedProject;
  }

  const projectEntry = manifest.projects.find((proj) => proj.name === project)!;
  const conventions = { ...manifest.conventions, ...(projectEntry.conventions ?? {}) };
  const allArtifacts = await discoverArtifacts(cacheDir, projectEntry, conventions);
  const optionalArtifacts = allArtifacts.filter((a) => a.optional);

  if (!nonInteractive && optionalArtifacts.length > 0) {
    const selected = (await p.multiselect({
      message: t('init.prompt.optional'),
      options: optionalArtifacts.map((a) => ({ value: a.sourcePath, label: a.sourcePath })),
    })) as string[];
    if (!p.isCancel(selected)) {
      optionalSet = new Set(selected);
    }
  }

  const artifacts = allArtifacts.filter((a) => !a.optional || optionalSet.has(a.sourcePath));
  const { files, managed, conflicts, warningLocaleKeys } = renderArtifacts(artifacts, tools);
  if (conflicts.length) {
    for (const conflict of conflicts) {
      console.error(
        t('adapter.pathConflict', {
          path: conflict.path,
          tools: conflict.adapterIds.join(', '),
        }),
      );
    }
    console.error(t('adapter.pathConflict.hint'));
    return 1;
  }
  await applyRenderedFiles(projectDir, files);
  await ensureHistoryRepo(projectDir);
  const writtenPaths = files.map((f) => f.path);
  const historyCommit = await commitInstalledFiles(projectDir, writtenPaths, 'imwel init');

  const binding = {
    remote,
    branch,
    project,
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
  console.log(t('init.success', { project, branch }));

  if (rebind && !nonInteractive && !opts.yes) {
    const syncNow = await p.confirm({ message: t('init.prompt.syncNow'), initialValue: true });
    if (!p.isCancel(syncNow) && syncNow) {
      return runSync({ continue: false });
    }
  }
  p.outro(t('common.done'));
  return 0;
}
