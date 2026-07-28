import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import { adapters } from '../adapters/index.js';
import type { PathConflict } from '../adapters/strategies/dedupe.js';
import { discoverArtifacts } from '../core/artifacts.js';
import {
  readBinding,
  writeBinding,
  type Binding,
  type ManagedArtifact,
} from '../core/binding.js';
import {
  applyInspectedRenderedFiles,
  type InspectedRenderedFile,
} from '../core/apply-files.js';
import { isInteractiveStdin, parseCsv } from '../core/cli-flags.js';
import { commitManagedChanges } from '../core/history.js';
import { readManifest, resolveConventions } from '../core/manifest.js';
import { inspectBindingRenderedFiles } from '../core/managed-write-safety.js';
import { printPathConflicts } from '../core/print-conflicts.js';
import {
  branchCommit,
  checkoutBranch,
  ensureRemoteCache,
} from '../core/remote-cache.js';
import { renderArtifacts } from '../core/render.js';
import { selectWithDiffConfirm } from '../core/select-diff.js';
import { t } from '../locales/index.js';
import type { LocaleKey } from '../locales/en.js';
import { confirmRenderedFileWrites } from './write-safety.js';

export interface ToolsOptions {
  yes?: boolean;
  add?: string;
  remove?: string;
  deleteOutput?: boolean;
}

type SelectionErrorCode = 'unknown' | 'overlap' | 'empty';

export class ToolsSelectionError extends Error {
  constructor(
    readonly code: SelectionErrorCode,
    readonly values: string[],
  ) {
    super(
      code === 'unknown'
        ? `Unknown tool ids: ${values.join(', ')}`
        : code === 'overlap'
          ? `Tools cannot be both added and removed: ${values.join(', ')}`
          : 'At least one tool must remain selected',
    );
  }
}

export interface ToolsSelection {
  selected: string[];
  added: string[];
  removed: string[];
}

export function resolveToolsSelection(
  installed: string[],
  opts: Pick<ToolsOptions, 'add' | 'remove'>,
  supported: string[] = adapters.map((adapter) => adapter.id),
): ToolsSelection {
  const add = parseCsv(opts.add);
  const remove = parseCsv(opts.remove);
  const supportedSet = new Set(supported);
  const unknown = [...new Set([...add, ...remove].filter((tool) => !supportedSet.has(tool)))];
  if (unknown.length > 0) {
    throw new ToolsSelectionError('unknown', unknown);
  }
  const removeSet = new Set(remove);
  const overlap = [...new Set(add.filter((tool) => removeSet.has(tool)))];
  if (overlap.length > 0) {
    throw new ToolsSelectionError('overlap', overlap);
  }

  const selected = [
    ...installed.filter((tool) => !removeSet.has(tool)),
    ...add.filter((tool) => !installed.includes(tool)),
  ];
  const uniqueSelected = [...new Set(selected)];
  if (uniqueSelected.length === 0) {
    throw new ToolsSelectionError('empty', []);
  }
  const selectedSet = new Set(uniqueSelected);
  return {
    selected: uniqueSelected,
    added: uniqueSelected.filter((tool) => !installed.includes(tool)),
    removed: installed.filter((tool) => !selectedSet.has(tool)),
  };
}

export interface ToolsChangePlan {
  added: string[];
  removed: string[];
  writeFiles: InspectedRenderedFile[];
  keepPaths: string[];
  deletePaths: string[];
  sharedPaths: string[];
  unmanagedPaths: string[];
  conflicts: PathConflict[];
  warningLocaleKeys: string[];
  nextBinding: Binding;
}

function artifactKey(artifact: Pick<ManagedArtifact, 'project' | 'sourcePath'>): string {
  return `${artifact.project}\u0000${artifact.sourcePath}`;
}

function onlyToolEntries<T>(
  entries: Record<string, T> | undefined,
  tools: ReadonlySet<string>,
): Record<string, T> | undefined {
  if (!entries) {
    return undefined;
  }
  const selected = Object.fromEntries(
    Object.entries(entries).filter(([tool]) => tools.has(tool)),
  );
  return Object.keys(selected).length > 0 ? selected : undefined;
}

function mergeAddedManaged(
  existing: ManagedArtifact[],
  rendered: ManagedArtifact[],
  added: string[],
): ManagedArtifact[] {
  const addedSet = new Set(added);
  const renderedByKey = new Map(rendered.map((artifact) => [artifactKey(artifact), artifact]));
  const merged = existing.map((artifact) => {
    const addition = renderedByKey.get(artifactKey(artifact));
    if (!addition) {
      return artifact;
    }
    renderedByKey.delete(artifactKey(artifact));
    const targetOverrides = {
      ...(artifact.targetOverrides ?? {}),
      ...(onlyToolEntries(addition.targetOverrides, addedSet) ?? {}),
    };
    return {
      ...artifact,
      installedPaths: {
        ...artifact.installedPaths,
        ...(onlyToolEntries(addition.installedPaths, addedSet) ?? {}),
      },
      targetOverrides:
        Object.keys(targetOverrides).length > 0 ? targetOverrides : undefined,
    };
  });

  for (const addition of renderedByKey.values()) {
    merged.push({
      ...addition,
      installedPaths: onlyToolEntries(addition.installedPaths, addedSet) ?? {},
      targetOverrides: onlyToolEntries(addition.targetOverrides, addedSet),
    });
  }
  return merged;
}

function removeToolManagement(
  artifacts: ManagedArtifact[],
  removed: ReadonlySet<string>,
): ManagedArtifact[] {
  return artifacts.map((artifact) => ({
    ...artifact,
    installedPaths: Object.fromEntries(
      Object.entries(artifact.installedPaths).filter(([tool]) => !removed.has(tool)),
    ),
  }));
}

function referencedPaths(artifacts: ManagedArtifact[]): Set<string> {
  return new Set(
    artifacts.flatMap((artifact) => Object.values(artifact.installedPaths).flat()),
  );
}

export async function planToolsChange(
  projectDir: string,
  cacheDir: string,
  binding: Binding,
  selectedTools: string[],
  deleteOutput: boolean,
): Promise<ToolsChangePlan> {
  const selectedSet = new Set(selectedTools);
  const added = selectedTools.filter((tool) => !binding.tools.includes(tool));
  const removed = binding.tools.filter((tool) => !selectedSet.has(tool));
  const removedSet = new Set(removed);
  let artifacts = binding.artifacts;
  let writeFiles: InspectedRenderedFile[] = [];
  let conflicts: PathConflict[] = [];
  let warningLocaleKeys: string[] = [];

  if (added.length > 0) {
    const manifest = await readManifest(cacheDir);
    const discovered = [];
    for (const bound of binding.projects) {
      if (bound.frozen) {
        continue;
      }
      const { project, conventions } = resolveConventions(manifest, bound.name);
      const selectedOptional = new Set(
        binding.artifacts
          .filter((artifact) => artifact.project === bound.name && artifact.optional)
          .map((artifact) => artifact.sourcePath),
      );
      discovered.push(
        ...(await discoverArtifacts(cacheDir, project, conventions, selectedOptional)),
      );
    }

    const overrideMap = new Map<string, Record<string, Record<string, unknown>>>();
    for (const artifact of binding.artifacts) {
      if (artifact.targetOverrides) {
        overrideMap.set(artifact.sourcePath, artifact.targetOverrides);
      }
    }
    const rendered = renderArtifacts(discovered, selectedTools, overrideMap);
    conflicts = rendered.conflicts;
    warningLocaleKeys = rendered.warningLocaleKeys;
    if (conflicts.length === 0) {
      const addedSet = new Set(added);
      const addedPaths = new Set(
        rendered.managed.flatMap((artifact) =>
          Object.entries(artifact.installedPaths)
            .filter(([tool]) => addedSet.has(tool))
            .flatMap(([, paths]) => paths),
        ),
      );
      const retainedManagedPaths = new Set(
        binding.artifacts.flatMap((artifact) =>
          Object.entries(artifact.installedPaths)
            .filter(([tool]) => !removedSet.has(tool))
            .flatMap(([, paths]) => paths),
        ),
      );
      const filesForAdded = rendered.files.filter(
        (file) => addedPaths.has(file.path) && !retainedManagedPaths.has(file.path),
      );
      writeFiles = await inspectBindingRenderedFiles(projectDir, filesForAdded, binding);
      artifacts = mergeAddedManaged(binding.artifacts, rendered.managed, added);
    }
  }

  artifacts = removeToolManagement(artifacts, removedSet);
  const removedPaths = new Set(
    binding.artifacts.flatMap((artifact) =>
      Object.entries(artifact.installedPaths)
        .filter(([tool]) => removedSet.has(tool))
        .flatMap(([, paths]) => paths),
    ),
  );
  const remainingPaths = referencedPaths(artifacts);
  const sharedPaths = [...removedPaths].filter((targetPath) => remainingPaths.has(targetPath));
  const unmanagedPaths = [...removedPaths].filter((targetPath) => !remainingPaths.has(targetPath));

  return {
    added,
    removed,
    writeFiles: conflicts.length > 0 ? [] : writeFiles,
    keepPaths: deleteOutput ? [] : unmanagedPaths.sort(),
    deletePaths: deleteOutput ? unmanagedPaths.sort() : [],
    sharedPaths: sharedPaths.sort(),
    unmanagedPaths: unmanagedPaths.sort(),
    conflicts,
    warningLocaleKeys,
    nextBinding: {
      ...binding,
      tools: selectedTools,
      artifacts,
    },
  };
}

export async function applyToolsPlan(
  projectDir: string,
  plan: ToolsChangePlan,
): Promise<void> {
  const writtenPaths = await applyInspectedRenderedFiles(projectDir, plan.writeFiles);
  for (const targetPath of plan.deletePaths) {
    await fs.rm(path.join(projectDir, targetPath), { force: true });
  }
  const historyCommit = await commitManagedChanges(
    projectDir,
    writtenPaths,
    plan.unmanagedPaths,
    'imwel tools',
  );
  plan.nextBinding.lastSyncedHistoryCommit = historyCommit;
  await writeBinding(projectDir, plan.nextBinding);
}

function printToolPlan(plan: ToolsChangePlan): void {
  console.log(t('tools.plan.title'));
  for (const tool of plan.added) {
    console.log(t('tools.plan.add', { tool }));
  }
  for (const tool of plan.removed) {
    console.log(t('tools.plan.remove', { tool }));
  }
  for (const targetPath of plan.keepPaths) {
    console.log(t('tools.plan.keep', { path: targetPath }));
  }
  for (const targetPath of plan.deletePaths) {
    console.log(t('tools.plan.delete', { path: targetPath }));
  }
  for (const targetPath of plan.sharedPaths) {
    console.log(t('tools.plan.shared', { path: targetPath }));
  }
}

async function confirmPlan(plan: ToolsChangePlan, yes: boolean): Promise<boolean> {
  if (yes) {
    return true;
  }
  if (!isInteractiveStdin()) {
    console.error(t('cli.nonInteractiveConfirmRequired'));
    return false;
  }
  const confirm = await p.confirm({
    message: t('tools.confirm', {
      added: plan.added.length,
      removed: plan.removed.length,
      kept: plan.keepPaths.length,
      deleted: plan.deletePaths.length,
      paths: plan.deletePaths.join(', ') || t('tools.none'),
    }),
    initialValue: false,
  });
  return !p.isCancel(confirm) && confirm;
}

function printSelectionError(error: ToolsSelectionError): void {
  if (error.code === 'unknown') {
    console.error(
      t('tools.unknown', {
        tools: error.values.join(', '),
        supported: adapters.map((adapter) => adapter.id).join(', '),
      }),
    );
  } else if (error.code === 'overlap') {
    console.error(t('tools.overlap', { tools: error.values.join(', ') }));
  } else {
    console.error(t('tools.empty'));
  }
}

export async function runTools(opts: ToolsOptions = {}): Promise<number> {
  p.intro(t('tools.title'));
  const projectDir = process.cwd();
  const binding = await readBinding(projectDir);
  if (!binding) {
    console.error(t('tools.noBinding'));
    return 1;
  }

  const explicitSelection = Boolean(opts.add?.trim() || opts.remove?.trim());
  let selection: ToolsSelection;
  if (!explicitSelection && isInteractiveStdin() && !opts.yes) {
    const ordered = [
      ...binding.tools,
      ...adapters.map((adapter) => adapter.id).filter((tool) => !binding.tools.includes(tool)),
    ];
    const result = await selectWithDiffConfirm({
      message: t('tools.prompt.select'),
      items: ordered.map((tool) => ({
        value: tool,
        label: t(`tool.${tool}` as LocaleKey),
      })),
      installed: binding.tools,
      required: true,
    });
    if (!result) {
      console.log(t('common.cancelled'));
      return 1;
    }
    selection = result;
  } else {
    if (!explicitSelection) {
      console.error(t('tools.flagsRequired'));
      return 1;
    }
    try {
      selection = resolveToolsSelection(binding.tools, opts);
    } catch (error) {
      if (error instanceof ToolsSelectionError) {
        printSelectionError(error);
        return 1;
      }
      throw error;
    }
  }

  if (selection.added.length === 0 && selection.removed.length === 0) {
    if (opts.deleteOutput) {
      console.error(t('tools.deleteNeedsRemove'));
      return 1;
    }
    console.log(t('tools.noChange'));
    return 0;
  }
  if (!isInteractiveStdin() && !opts.yes) {
    console.error(t('cli.nonInteractiveConfirmRequired'));
    return 1;
  }

  let deleteOutput = Boolean(opts.deleteOutput);
  if (selection.removed.length > 0 && !opts.deleteOutput && !opts.yes && isInteractiveStdin()) {
    const choice = (await p.select({
      message: t('tools.prompt.removedOutput'),
      options: [
        { value: 'keep', label: t('tools.prompt.keep') },
        { value: 'delete', label: t('tools.prompt.delete') },
      ],
      initialValue: 'keep',
    })) as string | symbol;
    if (p.isCancel(choice)) {
      console.log(t('common.cancelled'));
      return 1;
    }
    deleteOutput = choice === 'delete';
  }

  const spinner = p.spinner();
  spinner.start(t('tools.fetching', { alias: binding.remote }));
  const cacheDir = await ensureRemoteCache(binding.remote, { force: true });
  await checkoutBranch(cacheDir, binding.branch);
  const currentCommit = await branchCommit(cacheDir, binding.branch);
  spinner.stop(t('common.done'));
  if (currentCommit !== binding.lastSyncedCommit) {
    console.warn(t('tools.remoteDrift'));
  }

  const plan = await planToolsChange(
    projectDir,
    cacheDir,
    binding,
    selection.selected,
    deleteOutput,
  );
  if (plan.conflicts.length > 0) {
    printPathConflicts(plan.conflicts);
    return 1;
  }
  printToolPlan(plan);
  if (
    plan.writeFiles.length > 0 &&
    !(await confirmRenderedFileWrites(plan.writeFiles, Boolean(opts.yes)))
  ) {
    console.log(t('common.cancelled'));
    return 1;
  }
  const requiresDetailedConfirm = explicitSelection || deleteOutput;
  if (requiresDetailedConfirm && !(await confirmPlan(plan, Boolean(opts.yes)))) {
    console.log(t('common.cancelled'));
    return 1;
  }

  await applyToolsPlan(projectDir, plan);
  for (const key of plan.warningLocaleKeys) {
    console.warn(t(key as LocaleKey));
  }
  console.log(
    t('tools.applied', {
      added: plan.added.length,
      removed: plan.removed.length,
      kept: plan.keepPaths.length,
      deleted: plan.deletePaths.length,
    }),
  );
  p.outro(t('common.done'));
  return 0;
}
