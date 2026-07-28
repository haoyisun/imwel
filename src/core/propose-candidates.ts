import fs from 'node:fs/promises';
import path from 'node:path';
import type { Adapter, DiscoveredArtifact } from '../adapters/types.js';
import type { ArtifactType } from './artifact-types.js';
import type { Binding } from './binding.js';
import { classifyProvenance } from './provenance.js';
import type { ManifestConventions, ManifestProject } from './manifest.js';
import { projectRole } from './manifest.js';
import {
  contributionSourceIdentity,
  contributionTargetIdentity,
  type PendingProposal,
} from './propose.js';
import { showFileAtCommit, normalizeLineEndings } from './git.js';

export interface ProposeCandidate {
  path: string;
  sourceFiles: string[];
  sourceId: string;
  type: ArtifactType;
  tool: string;
  tracked: boolean;
  canonicalPath: string;
  canonicalContent: string;
  targetOverrides?: Record<string, unknown>;
  optional: boolean;
  status: 'clean' | 'modified' | 'pushed' | 'missing';
  conflictTools?: string[];
}

export interface ProposeCandidateSummary {
  candidates: ProposeCandidate[];
  conflicts: Array<{ canonicalPath: string; tools: string[] }>;
  excluded: {
    provenance: number;
    linkedBinding: number;
    otherTarget: number;
    conflict: number;
  };
}

export type ProposeDiscoveries = ReadonlyMap<string, readonly DiscoveredArtifact[]>;

function normalized(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '');
}

function bindingPathRoles(binding: Binding | null): Map<string, { project: string; mode: string }> {
  const result = new Map<string, { project: string; mode: string }>();
  const modes = new Map(binding?.projects.map((item) => [item.name, item.mode]) ?? []);
  for (const artifact of binding?.artifacts ?? []) {
    for (const paths of Object.values(artifact.installedPaths ?? {})) {
      for (const sourcePath of paths) {
        result.set(normalized(sourcePath), {
          project: artifact.project,
          mode: modes.get(artifact.project) ?? 'linked',
        });
      }
    }
  }
  return result;
}

export function deriveCanonicalPath(
  type: ArtifactType,
  slug: string,
  conventions: ManifestConventions,
): string {
  const safeSlug = slug.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  if (type === 'rule') {
    return `${normalized(conventions.rulesDir).replace(/\/$/, '')}/${safeSlug}.md`;
  }
  if (type === 'skill') {
    return `${normalized(conventions.skillsDir).replace(/\/$/, '')}/${safeSlug}`;
  }
  return normalized(conventions.agentsFile);
}

async function proposalStatus(
  projectDir: string,
  proposal: PendingProposal,
  adapter: Adapter | undefined,
  discovered: readonly DiscoveredArtifact[] | undefined,
  cacheDir: string,
  projectPath: string,
): Promise<ProposeCandidate['status']> {
  if (!adapter) {
    return 'missing';
  }
  const files: Array<{ path: string; content: string }> = [];
  for (const sourceFile of proposal.sourceFiles) {
    try {
      files.push({
        path: sourceFile,
        content: await fs.readFile(path.join(projectDir, sourceFile), 'utf8'),
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return 'missing';
      }
      throw error;
    }
  }
  if (!proposal.pushed) {
    return 'clean';
  }
  let parseFiles = files;
  if (discovered) {
    const matchingArtifact = discovered.find(
      (item) =>
        item.slug === proposal.sourceId &&
        item.type === proposal.type &&
        item.sourceFiles.map(normalized).sort().join('\u0000') ===
          proposal.sourceFiles.map(normalized).sort().join('\u0000'),
    );
    if (matchingArtifact) {
      parseFiles = matchingArtifact.files;
    }
  }
  const current = adapter.parseExisting(parseFiles).canonicalContent;
  const pushed = await showFileAtCommit(
    proposal.pushed.commit,
    path.posix.join(normalized(projectPath), proposal.canonicalPath),
    { cwd: cacheDir },
  );
  if (
    pushed !== null &&
    normalizeLineEndings(pushed).trimEnd() === normalizeLineEndings(current).trimEnd()
  ) {
    return 'pushed';
  }
  return 'modified';
}

/**
 * Collect candidates after the target is known. Tool-native paths are parsed by
 * their adapter and mapped to the selected target's canonical conventions.
 */
export async function collectProposeCandidates(
  projectDir: string,
  adapterList: Adapter[],
  binding: Binding | null,
  proposals: PendingProposal[],
  target: { remote: string; project: ManifestProject; conventions: ManifestConventions },
  cacheDir: string,
  precomputedDiscoveries?: ProposeDiscoveries,
): Promise<ProposeCandidateSummary> {
  const targetIdentity = `${target.remote}\u0000${target.project.name}`;
  const bindingRoles = bindingPathRoles(binding);
  const byCanonical = new Map<string, ProposeCandidate>();
  const conflicts: Array<{ canonicalPath: string; tools: string[] }> = [];
  const excluded = { provenance: 0, linkedBinding: 0, otherTarget: 0, conflict: 0 };
  const adapterById = new Map(adapterList.map((adapter) => [adapter.id, adapter]));
  const currentTracking = proposals.filter(
    (proposal) => contributionTargetIdentity(proposal) === targetIdentity,
  );
  const otherOwnership = new Map(
    proposals
      .filter((proposal) => contributionTargetIdentity(proposal) !== targetIdentity)
      .map((proposal) => [contributionSourceIdentity(proposal), contributionTargetIdentity(proposal)]),
  );

  for (const proposal of currentTracking) {
    const adapter = adapterById.get(proposal.tool);
    const status = await proposalStatus(
      projectDir,
      proposal,
      adapter,
      adapter
        ? (precomputedDiscoveries?.get(adapter.id) ??
          (adapter.discoverExisting ? await adapter.discoverExisting(projectDir) : undefined))
        : undefined,
      cacheDir,
      target.project.path,
    );
    let canonicalContent = '';
    let targetOverrides: Record<string, unknown> | undefined;
    if (status !== 'missing' && adapter) {
      const files = await Promise.all(
        proposal.sourceFiles.map(async (sourceFile) => ({
          path: sourceFile,
          content: await fs.readFile(path.join(projectDir, sourceFile), 'utf8'),
        })),
      );
      let parseFiles = files;
      const discoveredArtifacts =
        precomputedDiscoveries?.get(adapter.id) ??
        (adapter.discoverExisting ? await adapter.discoverExisting(projectDir) : undefined);
      if (discoveredArtifacts) {
        const discovered = discoveredArtifacts.find(
          (item) =>
            item.slug === proposal.sourceId &&
            item.type === proposal.type &&
            item.sourceFiles.map(normalized).sort().join('\u0000') ===
              proposal.sourceFiles.map(normalized).sort().join('\u0000'),
        );
        if (discovered) {
          parseFiles = discovered.files;
        }
      }
      const parsed = adapter.parseExisting(parseFiles);
      canonicalContent = parsed.canonicalContent;
      targetOverrides = parsed.targetOverrides;
    }
    byCanonical.set(`${proposal.type}\u0000${proposal.canonicalPath}`, {
      path: proposal.localPath,
      sourceFiles: proposal.sourceFiles,
      sourceId: proposal.sourceId,
      type: proposal.type,
      tool: proposal.tool,
      tracked: true,
      canonicalPath: proposal.canonicalPath,
      canonicalContent,
      targetOverrides,
      optional: proposal.optional,
      status,
    });
  }

  for (const adapter of adapterList) {
    if (!adapter.discoverExisting) {
      continue;
    }
    const discovered =
      precomputedDiscoveries?.get(adapter.id) ?? (await adapter.discoverExisting(projectDir));
    for (const item of discovered) {
      const sourceFiles = item.sourceFiles.map(normalized).sort();
      const primary = sourceFiles[0] ?? normalized(item.files[0]?.path ?? '');
      if (!primary) {
        continue;
      }
      const content = item.files.find((f) => f.path.replace(/\\/g, '/') === primary)?.content;
      if (classifyProvenance({ path: primary, content }).provenance !== 'USER') {
        excluded.provenance += 1;
        continue;
      }
      const bindingRole = bindingRoles.get(primary);
      if (bindingRole?.mode === 'linked') {
        excluded.linkedBinding += 1;
        continue;
      }
      if (
        bindingRole?.mode === 'subscribed' &&
        (bindingRole.project !== target.project.name || projectRole(target.project) !== 'shared')
      ) {
        excluded.otherTarget += 1;
        continue;
      }
      const sourceIdentity = contributionSourceIdentity({
        tool: adapter.id,
        sourceFiles,
        sourceId: item.slug,
      });
      if (otherOwnership.has(sourceIdentity)) {
        excluded.otherTarget += 1;
        continue;
      }
      const canonicalPath = deriveCanonicalPath(item.type, item.slug, target.conventions);
      const canonicalIdentity = `${item.type}\u0000${canonicalPath}`;
      const parsed = adapter.parseExisting(item.files);
      const existing = byCanonical.get(canonicalIdentity);
      if (existing) {
        if (
          normalizeLineEndings(existing.canonicalContent).trimEnd() !==
          normalizeLineEndings(parsed.canonicalContent).trimEnd()
        ) {
          const tools = [...new Set([existing.tool, adapter.id])];
          conflicts.push({ canonicalPath, tools });
          if (!existing.tracked) {
            existing.conflictTools = tools;
          }
          excluded.conflict += 1;
        }
        continue;
      }
      byCanonical.set(canonicalIdentity, {
        path: primary,
        sourceFiles,
        sourceId: item.slug,
        type: item.type,
        tool: adapter.id,
        tracked: false,
        canonicalPath,
        canonicalContent: parsed.canonicalContent,
        targetOverrides: parsed.targetOverrides,
        optional: false,
        status: 'clean',
      });
    }
  }

  return {
    candidates: [...byCanonical.values()]
      .filter((candidate) => !candidate.conflictTools)
      .sort((a, b) => Number(b.tracked) - Number(a.tracked) || a.canonicalPath.localeCompare(b.canonicalPath)),
    conflicts,
    excluded,
  };
}
