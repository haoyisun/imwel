import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import { discoverArtifacts } from '../core/artifacts.js';
import {
  readBinding,
  writeBinding,
  type Binding,
  type BoundProject,
  type ManagedArtifact,
} from '../core/binding.js';
import {
  applyInspectedRenderedFiles,
  type InspectedRenderedFile,
} from '../core/apply-files.js';
import { isInteractiveStdin, parseCsv } from '../core/cli-flags.js';
import { commitInstalledFiles, ensureHistoryRepo } from '../core/history.js';
import { readManifest, resolveConventions, projectRole } from '../core/manifest.js';
import { inspectBindingRenderedFiles, overwriteRisks } from '../core/managed-write-safety.js';
import { printPathConflicts } from '../core/print-conflicts.js';
import { checkoutBranch, ensureRemoteCache } from '../core/remote-cache.js';
import { renderArtifacts } from '../core/render.js';
import { selectWithDiffConfirm } from '../core/select-diff.js';
import { t } from '../locales/index.js';
import type { Artifact } from '../core/artifact-types.js';
import { confirmRenderedFileWrites } from './write-safety.js';

export interface ModulesOptions {
  yes?: boolean;
  add?: string;
  remove?: string;
  freeze?: string;
  unfreeze?: string;
}

export interface InstallModulesResult {
  ok: boolean;
  managed: ManagedArtifact[];
}

/**
 * Install newly-selected modules, but only after rendering them together with
 * every project that will remain bound (the writable project, plus already-installed
 * modules not being removed in this same call). This mirrors `imwel init`/`imwel sync`,
 * which always render the full bound set in one pass so a cross-project path conflict
 * (same target path, different content, from a different project) is caught here rather
 * than silently overwritten and only surfaced on a later `imwel sync`.
 */
export async function installModules(
  projectDir: string,
  cacheDir: string,
  binding: Binding,
  moduleNames: string[],
  remainingProjectNames: string[],
  authorize: (files: InspectedRenderedFile[]) => Promise<boolean> = async (files) =>
    overwriteRisks(files).length === 0,
): Promise<InstallModulesResult> {
  const manifest = await readManifest(cacheDir);
  const newArtifacts: Artifact[] = [];
  for (const name of moduleNames) {
    const { project, conventions } = resolveConventions(manifest, name);
    // Modules install their required artifacts only; optional artifacts can be
    // added by rebinding through `imwel init`.
    newArtifacts.push(...(await discoverArtifacts(cacheDir, project, conventions, new Set())));
  }

  const otherArtifacts: Artifact[] = [];
  for (const name of remainingProjectNames) {
    const { project, conventions } = resolveConventions(manifest, name);
    const selectedOptional = new Set(
      binding.artifacts
        .filter((a) => a.project === name && a.optional)
        .map((a) => a.sourcePath),
    );
    otherArtifacts.push(
      ...(await discoverArtifacts(cacheDir, project, conventions, selectedOptional)),
    );
  }

  const { files, managed, conflicts } = renderArtifacts(
    [...newArtifacts, ...otherArtifacts],
    binding.tools,
  );
  if (conflicts.length > 0) {
    printPathConflicts(conflicts);
    return { ok: false, managed: [] };
  }

  const addedNameSet = new Set(moduleNames);
  const managedForAdded = managed.filter((m) => addedNameSet.has(m.project));
  const addedPaths = new Set(
    managedForAdded.flatMap((m) => Object.values(m.installedPaths).flat()),
  );
  const filesForAdded = files.filter((f) => addedPaths.has(f.path));
  const inspectedFiles = await inspectBindingRenderedFiles(projectDir, filesForAdded, binding);
  if (!(await authorize(inspectedFiles))) {
    return { ok: false, managed: [] };
  }
  await applyInspectedRenderedFiles(projectDir, inspectedFiles);
  return { ok: true, managed: managedForAdded };
}

async function removeModuleFiles(
  projectDir: string,
  binding: Binding,
  moduleNames: string[],
): Promise<ManagedArtifact[]> {
  const removeSet = new Set(moduleNames);
  const kept: ManagedArtifact[] = [];
  for (const artifact of binding.artifacts) {
    if (!removeSet.has(artifact.project)) {
      kept.push(artifact);
      continue;
    }
    for (const paths of Object.values(artifact.installedPaths)) {
      for (const rel of paths) {
        await fs.rm(path.join(projectDir, rel), { force: true });
      }
    }
  }
  return kept;
}

export async function runModules(opts: ModulesOptions = {}): Promise<number> {
  p.intro(t('modules.title'));
  const projectDir = process.cwd();
  const binding = await readBinding(projectDir);
  if (!binding) {
    console.error(t('modules.noBinding'));
    return 1;
  }

  const spinner = p.spinner();
  spinner.start(t('modules.fetching', { alias: binding.remote }));
  const cacheDir = await ensureRemoteCache(binding.remote, { force: true });
  await checkoutBranch(cacheDir, binding.branch);
  spinner.stop(t('common.done'));

  const manifest = await readManifest(cacheDir);
  const sharedModules = manifest.projects.filter((proj) => projectRole(proj) === 'shared');
  if (sharedModules.length === 0) {
    console.log(t('modules.none'));
    return 0;
  }

  const installed = binding.projects
    .filter((bp) => bp.mode === 'subscribed')
    .map((bp) => bp.name);
  const frozen = new Set(
    binding.projects.filter((bp) => bp.mode === 'subscribed' && bp.frozen).map((bp) => bp.name),
  );

  const flagDriven =
    !isInteractiveStdin() ||
    Boolean(opts.yes || opts.add || opts.remove || opts.freeze || opts.unfreeze);

  let selected: string[];
  if (flagDriven) {
    const add = parseCsv(opts.add).filter((n) => sharedModules.some((m) => m.name === n));
    const remove = new Set(parseCsv(opts.remove));
    selected = [...new Set([...installed.filter((n) => !remove.has(n)), ...add])];
  } else {
    const orderedModules = [
      ...installed,
      ...sharedModules.map((m) => m.name).filter((n) => !installed.includes(n)),
    ];
    const result = await selectWithDiffConfirm({
      message: t('modules.prompt.select'),
      items: orderedModules.map((name) => ({ value: name, label: name })),
      installed,
    });
    if (!result) {
      console.log(t('common.cancelled'));
      return 1;
    }
    selected = result.selected;
  }

  const selectedSet = new Set(selected);
  const added = selected.filter((n) => !installed.includes(n));
  const removed = installed.filter((n) => !selectedSet.has(n));

  // Freeze/unfreeze only apply to still-installed modules.
  const freezeSet = new Set(parseCsv(opts.freeze));
  const unfreezeSet = new Set(parseCsv(opts.unfreeze));

  if (added.length === 0 && removed.length === 0 && freezeSet.size === 0 && unfreezeSet.size === 0) {
    console.log(t('modules.noChange'));
    return 0;
  }

  // Check for cross-project render conflicts *before* touching disk or the
  // binding, so a conflicting `--add` aborts the whole invocation atomically
  // (any requested `--remove`/`--freeze`/`--unfreeze` in the same call is
  // left un-applied too, and the binding stays exactly as it was).
  let newManaged: ManagedArtifact[] = [];
  if (added.length > 0) {
    const writableName = binding.projects.find((bp) => bp.mode === 'linked')?.name;
    const remainingProjectNames = [
      ...(writableName ? [writableName] : []),
      ...installed.filter((n) => !removed.includes(n)),
    ];
    const result = await installModules(
      projectDir,
      cacheDir,
      binding,
      added,
      remainingProjectNames,
      (files) => confirmRenderedFileWrites(files, Boolean(opts.yes)),
    );
    if (!result.ok) {
      return 1;
    }
    newManaged = result.managed;
  }

  let artifacts = binding.artifacts;
  if (removed.length > 0) {
    artifacts = await removeModuleFiles(projectDir, binding, removed);
  }
  if (added.length > 0) {
    artifacts = [...artifacts, ...newManaged];
  }

  const nextProjects: BoundProject[] = [
    ...binding.projects.filter((bp) => bp.mode === 'linked'),
    ...selected.map((name) => {
      const wasFrozen = frozen.has(name);
      const shouldFreeze = (wasFrozen || freezeSet.has(name)) && !unfreezeSet.has(name);
      return { name, mode: 'subscribed' as const, ...(shouldFreeze ? { frozen: true } : {}) };
    }),
  ];

  await ensureHistoryRepo(projectDir);
  const writtenPaths = [
    ...new Set(artifacts.flatMap((a) => Object.values(a.installedPaths).flat())),
  ];
  const historyCommit = await commitInstalledFiles(projectDir, writtenPaths, 'imwel modules');

  await writeBinding(projectDir, {
    ...binding,
    projects: nextProjects,
    artifacts,
    lastSyncedHistoryCommit: historyCommit,
  });

  console.log(t('modules.applied', { added: added.length, removed: removed.length }));
  if (added.length > 0) {
    console.log(t('modules.syncHint'));
  }
  p.outro(t('common.done'));
  return 0;
}
