import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { pendingProposalsPath } from './paths.js';
import type { ArtifactType } from './artifact-types.js';
import type { ProjectRole } from './manifest.js';

export interface PendingProposal {
  /** Kept in memory and on disk so older imwel releases can still identify the primary source. */
  localPath: string;
  sourceFiles: string[];
  /** Adapter discovery slug; distinguishes multiple logical artifacts in one shared file. */
  sourceId: string;
  remote: string;
  project: string;
  targetRole: ProjectRole;
  type: ArtifactType;
  canonicalPath: string;
  optional: boolean;
  tool: string;
  pushed?: {
    branch: string;
    commit: string;
  };
}

export interface PendingProposalsFile {
  version: 2;
  proposals: PendingProposal[];
}

interface LegacyPendingProposal {
  localPath?: unknown;
  sourceFiles?: unknown;
  sourceId?: unknown;
  remote?: unknown;
  project?: unknown;
  targetRole?: unknown;
  type?: unknown;
  canonicalPath?: unknown;
  optional?: unknown;
  tool?: unknown;
  pushed?: unknown;
}

interface RawPendingProposalsFile {
  version?: unknown;
  proposals?: unknown;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '');
}

function isArtifactType(value: unknown): value is ArtifactType {
  return value === 'rule' || value === 'skill' || value === 'agents';
}

function normalizeProposal(raw: LegacyPendingProposal, index: number): PendingProposal {
  const sourceFiles = Array.isArray(raw.sourceFiles)
    ? raw.sourceFiles.filter((item): item is string => typeof item === 'string').map(normalizePath)
    : typeof raw.localPath === 'string'
      ? [normalizePath(raw.localPath)]
      : [];
  const localPath =
    typeof raw.localPath === 'string' ? normalizePath(raw.localPath) : sourceFiles[0];
  if (
    !localPath ||
    sourceFiles.length === 0 ||
    typeof raw.remote !== 'string' ||
    typeof raw.project !== 'string' ||
    !isArtifactType(raw.type) ||
    typeof raw.tool !== 'string'
  ) {
    throw new Error(
      `Invalid contribution tracking record at proposals[${index}]; fix .imwel/pending-proposals.yaml before retrying`,
    );
  }
  const canonicalPath =
    typeof raw.canonicalPath === 'string' ? normalizePath(raw.canonicalPath) : localPath;
  const sourceId =
    typeof raw.sourceId === 'string' && raw.sourceId
      ? raw.sourceId
      : path.posix.basename(canonicalPath).replace(/\.[^.]+$/, '').toLowerCase();
  const pushed =
    raw.pushed &&
    typeof raw.pushed === 'object' &&
    typeof (raw.pushed as { branch?: unknown }).branch === 'string' &&
    typeof (raw.pushed as { commit?: unknown }).commit === 'string'
      ? {
          branch: (raw.pushed as { branch: string }).branch,
          commit: (raw.pushed as { commit: string }).commit,
        }
      : undefined;
  return {
    localPath,
    sourceFiles: [...new Set(sourceFiles)].sort(),
    sourceId,
    remote: raw.remote,
    project: raw.project,
    targetRole: raw.targetRole === 'shared' ? 'shared' : 'project',
    type: raw.type,
    canonicalPath,
    optional: raw.optional === true,
    tool: raw.tool,
    ...(pushed ? { pushed } : {}),
  };
}

async function writeAtomic(filePath: string, data: PendingProposalsFile): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporaryPath, YAML.stringify(data), 'utf8');
  try {
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }
}

export async function readPendingProposals(projectDir: string): Promise<PendingProposal[]> {
  const filePath = pendingProposalsPath(projectDir);
  const data = await readPendingProposalsData(filePath);
  if (!data) {
    return [];
  }
  const rawProposals = data.proposals as LegacyPendingProposal[];
  let proposals = rawProposals.map((item, index) =>
    normalizeProposal((item ?? {}) as LegacyPendingProposal, index),
  );
  if (data.version !== 2) {
    proposals = await Promise.all(
      proposals.map(async (proposal, index) => {
        const original = rawProposals[index]!;
        if (typeof original.canonicalPath === 'string' && original.targetRole !== undefined) {
          return proposal;
        }
        try {
          const [{ ensureRemoteCache }, manifestModule] = await Promise.all([
            import('./remote-cache.js'),
            import('./manifest.js'),
          ]);
          const cacheDir = await ensureRemoteCache(proposal.remote, { force: false });
          const manifest = await manifestModule.readManifest(cacheDir);
          const resolved = manifestModule.resolveConventions(manifest, proposal.project);
          const source = proposal.localPath;
          const base = path.posix.basename(source).replace(/\.[^.]+$/, '').toLowerCase();
          const skillMatch = source.match(/\/skills\/([^/]+)/);
          const skillSlug = skillMatch?.[1] ?? (base === 'skill' ? path.posix.basename(path.posix.dirname(source)) : base);
          const canonicalPath =
            proposal.type === 'rule'
              ? `${resolved.conventions.rulesDir.replace(/\\/g, '/').replace(/\/$/, '')}/${base}.md`
              : proposal.type === 'skill'
                ? `${resolved.conventions.skillsDir.replace(/\\/g, '/').replace(/\/$/, '')}/${skillSlug}`
                : resolved.conventions.agentsFile;
          return {
            ...proposal,
            targetRole: manifestModule.projectRole(resolved.project),
            canonicalPath: normalizePath(canonicalPath),
          };
        } catch {
          // Preserve unresolved legacy data verbatim; commands surface validation instead of dropping it.
          return proposal;
        }
      }),
    );
    await writeAtomic(filePath, { version: 2, proposals });
  }
  return proposals;
}

async function readPendingProposalsData(
  filePath: string,
): Promise<RawPendingProposalsFile | null> {
  let rawText: string;
  try {
    rawText = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
  const data = YAML.parse(rawText) as RawPendingProposalsFile | null;
  if (!data || !Array.isArray(data.proposals)) {
    throw new Error(
      'Invalid contribution tracking file; expected a proposals list in .imwel/pending-proposals.yaml',
    );
  }
  return data;
}

/**
 * Compatibility read for inspection. Unlike the mutating reader used by contribution
 * workflows, this never migrates YAML or resolves legacy metadata through a remote cache.
 */
export async function readPendingProposalsReadonly(
  projectDir: string,
): Promise<PendingProposal[]> {
  const data = await readPendingProposalsData(pendingProposalsPath(projectDir));
  if (!data) {
    return [];
  }
  return (data.proposals as LegacyPendingProposal[]).map((item, index) =>
    normalizeProposal((item ?? {}) as LegacyPendingProposal, index),
  );
}

export async function addPendingProposal(
  projectDir: string,
  proposal: PendingProposal,
): Promise<void> {
  const existing = await readPendingProposals(projectDir);
  const identity = contributionSourceIdentity(proposal);
  const conflicting = existing.find(
    (item) =>
      contributionSourceIdentity(item) === identity &&
      contributionTargetIdentity(item) !== contributionTargetIdentity(proposal),
  );
  if (conflicting) {
    throw new Error(
      `Local artifact is already tracked for ${conflicting.remote}/${conflicting.project}; cancel that tracking before reassigning it`,
    );
  }
  const filtered = existing.filter((item) => contributionSourceIdentity(item) !== identity);
  filtered.push(proposal);
  await writePendingProposals(projectDir, filtered);
}

export async function clearPendingProposals(projectDir: string): Promise<void> {
  try {
    await fs.rm(pendingProposalsPath(projectDir), { force: true });
  } catch {
    // ignore
  }
}

export async function writePendingProposals(
  projectDir: string,
  proposals: PendingProposal[],
): Promise<void> {
  if (proposals.length === 0) {
    await clearPendingProposals(projectDir);
    return;
  }
  await writeAtomic(pendingProposalsPath(projectDir), { version: 2, proposals });
}

export function buildProposal(
  sourceFiles: string[] | string,
  remote: string,
  project: string,
  targetRole: ProjectRole,
  type: ArtifactType,
  canonicalPath: string,
  optional: boolean,
  tool: string,
  sourceId?: string,
): PendingProposal {
  const normalizedSources = (Array.isArray(sourceFiles) ? sourceFiles : [sourceFiles])
    .map(normalizePath)
    .sort();
  return {
    localPath: normalizedSources[0]!,
    sourceFiles: normalizedSources,
    sourceId:
      sourceId ??
      path.posix.basename(normalizePath(canonicalPath)).replace(/\.[^.]+$/, '').toLowerCase(),
    remote,
    project,
    targetRole,
    type,
    canonicalPath: normalizePath(canonicalPath),
    optional,
    tool,
  };
}

export function contributionSourceIdentity(
  proposal: Pick<PendingProposal, 'tool' | 'sourceFiles' | 'sourceId'>,
): string {
  return `${proposal.tool}\u0000${proposal.sourceFiles.map(normalizePath).sort().join('\u0000')}\u0000${proposal.sourceId}`;
}

export function contributionTargetIdentity(
  proposal: Pick<PendingProposal, 'remote' | 'project'>,
): string {
  return `${proposal.remote}\u0000${proposal.project}`;
}

export function buildContributionOwnershipIndex(
  proposals: PendingProposal[],
): Map<string, string> {
  const ownership = new Map<string, string>();
  for (const proposal of proposals) {
    const source = contributionSourceIdentity(proposal);
    const target = contributionTargetIdentity(proposal);
    const existing = ownership.get(source);
    if (existing && existing !== target) {
      throw new Error(`Contribution tracking contains duplicate ownership for ${proposal.localPath}`);
    }
    ownership.set(source, target);
  }
  return ownership;
}

export function markSuccessfulPushes(
  proposals: PendingProposal[],
  sourceIdentities: ReadonlySet<string>,
  pushed: { branch: string; commit: string },
): PendingProposal[] {
  return proposals.map((proposal) =>
    sourceIdentities.has(contributionSourceIdentity(proposal))
      ? { ...proposal, pushed: { ...pushed } }
      : proposal,
  );
}

export function graduateProjectContributions(
  proposals: PendingProposal[],
  remote: string,
  managed: ReadonlyArray<{ project: string; type: ArtifactType; sourcePath: string }>,
): PendingProposal[] {
  const installed = new Set(
    managed.map(
      (artifact) =>
        `${artifact.project}\u0000${artifact.type}\u0000${normalizePath(artifact.sourcePath)}`,
    ),
  );
  return proposals.filter(
    (proposal) =>
      proposal.targetRole === 'shared' ||
      proposal.remote !== remote ||
      !installed.has(
        `${proposal.project}\u0000${proposal.type}\u0000${normalizePath(proposal.canonicalPath)}`,
      ),
  );
}
