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
import { applyRenderedFiles } from '../core/apply-files.js';
import { isInteractiveStdin, parseCsv } from '../core/cli-flags.js';
import { commitInstalledFiles, ensureHistoryRepo } from '../core/history.js';
import { readManifest, resolveConventions, projectRole } from '../core/manifest.js';
import { checkoutBranch, ensureRemoteCache } from '../core/remote-cache.js';
import { renderArtifacts } from '../core/render.js';
import { selectWithDiffConfirm } from '../core/select-diff.js';
import { t } from '../locales/index.js';

export interface ModulesOptions {
  yes?: boolean;
  add?: string;
  remove?: string;
  freeze?: string;
  unfreeze?: string;
}

async function installModules(
  projectDir: string,
  cacheDir: string,
  binding: Binding,
  moduleNames: string[],
): Promise<ManagedArtifact[]> {
  const manifest = await readManifest(cacheDir);
  const managed: ManagedArtifact[] = [];
  for (const name of moduleNames) {
    const { project, conventions } = resolveConventions(manifest, name);
    // Modules install their required artifacts only; optional artifacts can be
    // added by rebinding through `imwel init`.
    const artifacts = await discoverArtifacts(cacheDir, project, conventions, new Set());
    const { files, managed: rendered } = renderArtifacts(artifacts, binding.tools);
    await applyRenderedFiles(projectDir, files);
    managed.push(...rendered);
  }
  return managed;
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

  let artifacts = binding.artifacts;
  if (removed.length > 0) {
    artifacts = await removeModuleFiles(projectDir, binding, removed);
  }
  if (added.length > 0) {
    const newManaged = await installModules(projectDir, cacheDir, binding, added);
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
