import path from 'node:path';
import * as p from '@clack/prompts';
import { adapters } from '../adapters/index.js';
import { listRemotes } from '../core/config.js';
import { readManifest, resolveConventions } from '../core/manifest.js';
import { ensureRemoteCache } from '../core/remote-cache.js';
import { addPendingProposal, buildProposal } from '../core/propose.js';
import { validateProposalPath } from '../core/propose-validate.js';
import {
  exitIfMissingFlags,
  isInteractiveStdin,
} from '../core/cli-flags.js';
import { pathExists } from '../core/fs-utils.js';
import type { ArtifactType } from '../core/artifact-types.js';
import { t } from '../locales/index.js';

export interface ProposeOptions {
  yes?: boolean;
  remote?: string;
  project?: string;
  type?: string;
  optional?: boolean;
  required?: boolean;
  tool?: string;
}

function hasSelectionFlags(opts: ProposeOptions): boolean {
  return Boolean(
    opts.remote ||
      opts.project ||
      opts.type ||
      opts.tool ||
      opts.optional === true ||
      opts.required === true,
  );
}

function useNonInteractive(opts: ProposeOptions): boolean {
  return !isInteractiveStdin() || Boolean(opts.yes) || hasSelectionFlags(opts);
}

const ARTIFACT_TYPES: ArtifactType[] = ['rule', 'skill', 'agents'];

export async function runPropose(filePath: string, opts: ProposeOptions = {}): Promise<number> {
  p.intro(t('propose.title'));
  const projectDir = process.cwd();
  const rel = path.relative(projectDir, path.resolve(projectDir, filePath)).replace(/\\/g, '/');
  if (!(await pathExists(path.join(projectDir, rel)))) {
    console.error(t('propose.fileMissing', { path: rel }));
    return 1;
  }

  const remotes = Object.keys(await listRemotes());
  if (remotes.length === 0) {
    console.error(t('init.noRemotes'));
    return 1;
  }

  const nonInteractive = useNonInteractive(opts);
  let remote: string;
  let project: string;
  let type: ArtifactType;
  let optional: boolean;
  let tool: string;

  if (nonInteractive) {
    const optionalFlag =
      opts.optional === true || opts.required === true
        ? 'set'
        : undefined;
    const missing = exitIfMissingFlags({
      '--remote': opts.remote,
      '--project': opts.project,
      '--type': opts.type,
      '--tool': opts.tool,
      '--optional/--required': optionalFlag,
    });
    if (missing !== null) {
      return missing;
    }
    remote = opts.remote!;
    if (!remotes.includes(remote)) {
      console.error(t('init.unknownRemote', { alias: remote }));
      return 1;
    }
    project = opts.project!;
    if (!ARTIFACT_TYPES.includes(opts.type as ArtifactType)) {
      console.error(t('propose.unknownType', { type: opts.type ?? '' }));
      return 1;
    }
    type = opts.type as ArtifactType;
    optional = opts.optional === true;
    tool = opts.tool!;
    if (!adapters.some((a) => a.id === tool)) {
      console.error(t('propose.unknownTool', { tool }));
      return 1;
    }
  } else {
    const selectedRemote = (await p.select({
      message: t('propose.prompt.remote'),
      options: remotes.map((alias) => ({ value: alias, label: alias })),
    })) as string;
    if (p.isCancel(selectedRemote)) {
      console.log(t('common.cancelled'));
      return 1;
    }
    remote = selectedRemote;

    const cacheDirInteractive = await ensureRemoteCache(remote, { force: true });
    const manifestInteractive = await readManifest(cacheDirInteractive);
    const selectedProject = (await p.select({
      message: t('propose.prompt.project'),
      options: manifestInteractive.projects.map((proj) => ({
        value: proj.name,
        label: proj.name,
      })),
    })) as string;
    if (p.isCancel(selectedProject)) {
      console.log(t('common.cancelled'));
      return 1;
    }
    project = selectedProject;

    const selectedType = (await p.select({
      message: t('propose.prompt.type'),
      options: [
        { value: 'rule', label: t('artifact.type.rule') },
        { value: 'skill', label: t('artifact.type.skill') },
        { value: 'agents', label: t('artifact.type.agents') },
      ],
    })) as ArtifactType;
    if (p.isCancel(selectedType)) {
      console.log(t('common.cancelled'));
      return 1;
    }
    type = selectedType;

    const optionalAnswer = await p.confirm({
      message: t('propose.prompt.optional'),
      initialValue: false,
    });
    if (p.isCancel(optionalAnswer)) {
      console.log(t('common.cancelled'));
      return 1;
    }
    optional = Boolean(optionalAnswer);

    const selectedTool = (await p.select({
      message: t('propose.prompt.tool'),
      options: adapters.map((adapter) => ({
        value: adapter.id,
        label: t(`tool.${adapter.id}` as 'tool.cursor'),
      })),
    })) as string;
    if (p.isCancel(selectedTool)) {
      console.log(t('common.cancelled'));
      return 1;
    }
    tool = selectedTool;
  }

  const cacheDir = await ensureRemoteCache(remote, { force: true });
  const manifest = await readManifest(cacheDir);
  if (!manifest.projects.some((proj) => proj.name === project)) {
    console.error(t('init.unknownProject', { project }));
    return 1;
  }
  const { conventions } = resolveConventions(manifest, project);
  const validation = validateProposalPath(rel, type, conventions);
  if (!validation.ok) {
    console.error(
      t('propose.pathInvalid', {
        path: rel,
        type,
        expected: validation.expected ?? '',
      }),
    );
    return 1;
  }

  const proposal = buildProposal(rel, remote, project, type, optional, tool);
  await addPendingProposal(projectDir, proposal);
  console.log(t('propose.success', { path: rel }));
  p.outro(t('common.done'));
  return 0;
}
