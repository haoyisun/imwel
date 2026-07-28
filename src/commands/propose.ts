import path from 'node:path';
import * as p from '@clack/prompts';
import { adapters } from '../adapters/index.js';
import type { Adapter, DiscoveredArtifact } from '../adapters/types.js';
import { readBinding, type Binding } from '../core/binding.js';
import { error as outputError, info, success } from '../core/cli-output.js';
import { listRemotes } from '../core/config.js';
import {
  projectRole,
  readManifest,
  resolveConventions,
  type Manifest,
} from '../core/manifest.js';
import { ensureRemoteCache } from '../core/remote-cache.js';
import {
  addPendingProposal,
  buildProposal,
  contributionSourceIdentity,
  contributionTargetIdentity,
  readPendingProposals,
  type PendingProposal,
  writePendingProposals,
} from '../core/propose.js';
import {
  collectProposeCandidates,
  deriveCanonicalPath,
  type ProposeDiscoveries,
} from '../core/propose-candidates.js';
import { validateProposalPath } from '../core/propose-validate.js';
import { selectWithDiffConfirm } from '../core/select-diff.js';
import {
  exitIfMissingFlags,
  isInteractiveStdin,
} from '../core/cli-flags.js';
import { pathExists } from '../core/fs-utils.js';
import type { ArtifactType } from '../core/artifact-types.js';
import { t } from '../locales/index.js';
import { toSlug } from '../adapters/slug.js';

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

export interface ProposeFastFailInput {
  filePath: string | undefined;
  nonInteractive: boolean;
  candidateCounts: readonly number[];
  hasPendingForRemote: boolean;
}

export function shouldFastFailPropose(input: ProposeFastFailInput): boolean {
  return (
    !input.filePath &&
    !input.nonInteractive &&
    !input.hasPendingForRemote &&
    input.candidateCounts.every((count) => count === 0)
  );
}

async function discoverProposeArtifacts(
  projectDir: string,
  adapterList: Adapter[],
): Promise<ProposeDiscoveries> {
  const entries = await Promise.all(
    adapterList.map(async (adapter): Promise<readonly [string, readonly DiscoveredArtifact[]]> => [
      adapter.id,
      adapter.discoverExisting ? await adapter.discoverExisting(projectDir) : [],
    ]),
  );
  return new Map(entries);
}

export interface ProposePreflightDependencies {
  adapterList: Adapter[];
  readBinding(projectDir: string): Promise<Binding | null>;
  readProposals(projectDir: string): Promise<PendingProposal[]>;
  collectCandidates: typeof collectProposeCandidates;
  selectProject(manifest: Manifest): Promise<string | symbol>;
}

export interface ProposeProjectSelectionInput {
  projectDir: string;
  cacheDir: string;
  remote: string;
  manifest: Manifest;
  filePath: string | undefined;
  nonInteractive: boolean;
}

export interface ProposeProjectSelectionResult {
  fastFailed: boolean;
  selectedProject?: string | symbol;
  binding?: Binding | null;
  proposals?: PendingProposal[];
  discoveries?: ProposeDiscoveries;
}

export async function prepareProposeProjectSelection(
  input: ProposeProjectSelectionInput,
  dependencies: ProposePreflightDependencies = {
    adapterList: adapters,
    readBinding,
    readProposals: readPendingProposals,
    collectCandidates: collectProposeCandidates,
    selectProject: async (manifest) =>
      p.select({
        message: t('propose.prompt.project'),
        options: manifest.projects.map((item) => ({
          value: item.name,
          label: `${item.name} (${projectRole(item)})`,
        })),
      }) as Promise<string | symbol>,
  },
): Promise<ProposeProjectSelectionResult> {
  if (input.filePath || input.nonInteractive) {
    return { fastFailed: false };
  }

  const [binding, proposals, discoveries] = await Promise.all([
    dependencies.readBinding(input.projectDir),
    dependencies.readProposals(input.projectDir),
    discoverProposeArtifacts(input.projectDir, dependencies.adapterList),
  ]);
  const candidateCounts = await Promise.all(
    input.manifest.projects.map(async (manifestProject) => {
      const resolvedProject = resolveConventions(input.manifest, manifestProject.name);
      const summary = await dependencies.collectCandidates(
        input.projectDir,
        dependencies.adapterList,
        binding,
        proposals,
        {
          remote: input.remote,
          project: resolvedProject.project,
          conventions: resolvedProject.conventions,
        },
        input.cacheDir,
        discoveries,
      );
      return summary.candidates.length;
    }),
  );
  const manifestProjects = new Set(input.manifest.projects.map((project) => project.name));
  const hasPendingForRemote = proposals.some(
    (proposal) =>
      proposal.remote === input.remote && manifestProjects.has(proposal.project),
  );
  const fastFailed = shouldFastFailPropose({
    filePath: input.filePath,
    nonInteractive: input.nonInteractive,
    candidateCounts,
    hasPendingForRemote,
  });
  return {
    fastFailed,
    ...(fastFailed
      ? {}
      : { selectedProject: await dependencies.selectProject(input.manifest) }),
    binding,
    proposals,
    discoveries,
  };
}

const ARTIFACT_TYPES: ArtifactType[] = ['rule', 'skill', 'agents'];

export async function runPropose(filePath?: string, opts: ProposeOptions = {}): Promise<number> {
  p.intro(t('propose.title'));
  const projectDir = process.cwd();
  const remotes = Object.keys(await listRemotes());
  if (remotes.length === 0) {
    outputError(t('init.noRemotes'));
    return 1;
  }
  const nonInteractive = useNonInteractive(opts);
  if (!filePath && nonInteractive) {
    outputError(t('propose.multiselect.needsInteractive'));
    return 1;
  }
  if (filePath && !(await pathExists(path.resolve(projectDir, filePath)))) {
    outputError(t('propose.fileMissing', { path: filePath }));
    return 1;
  }

  let remote = opts.remote;
  if (!remote && !nonInteractive) {
    const selected = await p.select({
      message: t('propose.prompt.remote'),
      options: remotes.map((alias) => ({ value: alias, label: alias })),
    });
    if (p.isCancel(selected)) {
      info(t('common.cancelled'));
      return 1;
    }
    remote = String(selected);
  }
  if (!remote) {
    const missing = exitIfMissingFlags({ '--remote': remote });
    return missing ?? 1;
  }
  if (!remotes.includes(remote)) {
    outputError(t('init.unknownRemote', { alias: remote }));
    return 1;
  }

  const cacheDir = await ensureRemoteCache(remote, { force: true });
  const manifest = await readManifest(cacheDir);
  const preflight = await prepareProposeProjectSelection({
    projectDir,
    cacheDir,
    remote,
    manifest,
    filePath,
    nonInteractive,
  });
  if (preflight.fastFailed) {
    info(t('propose.multiselect.none.actionable'));
    return 0;
  }
  let project = opts.project;
  if (!project && !nonInteractive) {
    const selected = preflight.selectedProject;
    if (p.isCancel(selected)) {
      info(t('common.cancelled'));
      return 1;
    }
    project = String(selected);
  }
  if (!project) {
    const missing = exitIfMissingFlags({ '--project': project });
    return missing ?? 1;
  }
  const resolved = resolveConventions(manifest, project);
  const binding =
    preflight.binding === undefined ? await readBinding(projectDir) : preflight.binding;
  const proposals =
    preflight.proposals === undefined
      ? await readPendingProposals(projectDir)
      : preflight.proposals;

  if (filePath) {
    const optionalFlag = opts.optional === true || opts.required === true ? 'set' : undefined;
    if (nonInteractive) {
      const missing = exitIfMissingFlags({
        '--type': opts.type,
        '--tool': opts.tool,
        '--optional/--required': optionalFlag,
      });
      if (missing !== null) {
        return missing;
      }
    }
    let type = opts.type as ArtifactType | undefined;
    if (!type && !nonInteractive) {
      const selected = await p.select({
        message: t('propose.prompt.type'),
        options: ARTIFACT_TYPES.map((value) => ({
          value,
          label: t(`artifact.type.${value}` as 'artifact.type.rule'),
        })),
      });
      if (p.isCancel(selected)) {
        info(t('common.cancelled'));
        return 1;
      }
      type = selected as ArtifactType;
    }
    if (!ARTIFACT_TYPES.includes(type as ArtifactType)) {
      outputError(t('propose.unknownType', { type: type ?? '' }));
      return 1;
    }
    let tool = opts.tool;
    if (!tool && !nonInteractive) {
      const selected = await p.select({
        message: t('propose.prompt.tool'),
        options: adapters.map((adapter) => ({ value: adapter.id, label: adapter.id })),
      });
      if (p.isCancel(selected)) {
        info(t('common.cancelled'));
        return 1;
      }
      tool = String(selected);
    }
    const adapter = adapters.find((item) => item.id === tool);
    if (!adapter) {
      outputError(t('propose.unknownTool', { tool: tool ?? '' }));
      return 1;
    }
    let optional = opts.optional === true;
    if (!optionalFlag && !nonInteractive) {
      const answer = await p.confirm({
        message: t('propose.prompt.optional'),
        initialValue: false,
      });
      if (p.isCancel(answer)) {
        info(t('common.cancelled'));
        return 1;
      }
      optional = Boolean(answer);
    }
    const rel = path.relative(projectDir, path.resolve(projectDir, filePath)).replace(/\\/g, '/');
    let sourceFiles = [rel];
    let canonicalContent = '';
    let slug = toSlug(rel);
    if (adapter.discoverExisting) {
      const discovered = (await adapter.discoverExisting(projectDir)).find((item) =>
        item.sourceFiles.map((source) => source.replace(/\\/g, '/')).includes(rel),
      );
      if (discovered) {
        sourceFiles = discovered.sourceFiles;
        canonicalContent = adapter.parseExisting(discovered.files).canonicalContent;
        slug = discovered.slug;
      }
    }
    if (!canonicalContent) {
      const content = await import('node:fs/promises').then((fs) =>
        fs.readFile(path.join(projectDir, rel), 'utf8'),
      );
      canonicalContent = adapter.parseExisting([{ path: rel, content }]).canonicalContent;
    }
    const canonicalPath = deriveCanonicalPath(type!, slug, resolved.conventions);
    const validation = validateProposalPath(canonicalPath, type!, resolved.conventions);
    if (!validation.ok || !canonicalContent.trim()) {
      outputError(
        t('propose.pathInvalid', {
          path: canonicalPath,
          type: type!,
          expected: validation.expected ?? '',
        }),
      );
      return 1;
    }
    try {
      await addPendingProposal(
        projectDir,
        buildProposal(
          sourceFiles,
          remote,
          project,
          projectRole(resolved.project),
          type!,
          canonicalPath,
          optional,
          tool!,
          slug,
        ),
      );
    } catch (error) {
      outputError(t('common.error', { message: (error as Error).message }));
      return 1;
    }
    success(t('propose.success', { path: canonicalPath }));
    p.outro(t('common.done'));
    return 0;
  }

  const summary = await collectProposeCandidates(
    projectDir,
    adapters,
    binding,
    proposals,
    { remote, project: resolved.project, conventions: resolved.conventions },
    cacheDir,
    preflight.discoveries,
  );
  if (summary.candidates.length === 0) {
    info(t('propose.multiselect.none'));
    return 0;
  }
  info(
    t('propose.multiselect.excluded', {
      provenance: summary.excluded.provenance,
      binding: summary.excluded.linkedBinding,
      target: summary.excluded.otherTarget,
      conflict: summary.excluded.conflict,
    }),
  );
  for (const conflict of summary.conflicts) {
    outputError(
      t('propose.multiselect.conflict', {
        path: conflict.canonicalPath,
        tools: conflict.tools.join(', '),
      }),
    );
  }
  const tracked = summary.candidates.filter((item) => item.tracked);
  const result = await selectWithDiffConfirm({
    message: t('propose.multiselect.prompt'),
    items: summary.candidates.map((candidate) => ({
      value: contributionSourceIdentity(candidate),
      label: `${candidate.canonicalPath} [${candidate.status}]`,
      hint: `${candidate.tool}: ${candidate.sourceFiles.join(', ')}`,
    })),
    installed: tracked.map(contributionSourceIdentity),
  });
  if (!result) {
    info(t('common.cancelled'));
    return 1;
  }
  const currentTarget = `${remote}\u0000${project}`;
  const kept = proposals.filter(
    (proposal) =>
      contributionTargetIdentity(proposal) !== currentTarget ||
      !result.removed.includes(contributionSourceIdentity(proposal)),
  );
  for (const identity of result.added) {
    const candidate = summary.candidates.find(
      (item) => contributionSourceIdentity(item) === identity,
    );
    if (!candidate) {
      continue;
    }
    kept.push(
      buildProposal(
        candidate.sourceFiles,
        remote,
        project,
        projectRole(resolved.project),
        candidate.type,
        candidate.canonicalPath,
        candidate.optional,
        candidate.tool,
        candidate.sourceId,
      ),
    );
  }
  await writePendingProposals(projectDir, kept);
  success(
    t('propose.multiselect.done', {
      added: result.added.length,
      removed: result.removed.length,
    }),
  );
  p.outro(t('common.done'));
  return 0;
}
