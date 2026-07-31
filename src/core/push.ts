import fs from 'node:fs/promises';
import path from 'node:path';
import { getAdapter } from '../adapters/index.js';
import { getRemote } from './config.js';
import type { Binding, ManagedArtifact } from './binding.js';
import { listDirtyPaths } from './history.js';
import { ensureRemoteCache, remoteBranchCommit } from './remote-cache.js';
import { runGit } from './git.js';
import {
  contributionSourceIdentity,
  type PendingProposal,
} from './propose.js';
import { resolveConventions, readManifest } from './manifest.js';
import { pathExists } from './fs-utils.js';
import { assertBundlePathsSafe } from './propose-validate.js';
import { toSlug } from '../adapters/slug.js';
import type { BundleFile } from './artifact-types.js';

export interface PushCandidate {
  sourcePath: string;
  sourceFiles: string[];
  canonicalPath: string;
  type: ManagedArtifact['type'];
  optional: boolean;
  canonicalContent: string;
  targetOverrides?: Record<string, Record<string, unknown>>;
  /** For `type=skill`: full bundle (SKILL.md + accompanying files) to write upstream. */
  bundleFiles?: BundleFile[];
  projectPath: string;
  remote: string;
  project: string;
  kind: 'binding' | 'proposal' | 'module-contribution';
  trackingIdentity?: string;
}

export interface SkippedPushInput {
  sourcePath: string;
  kind: 'binding' | 'proposal';
  missingPaths: string[];
  trackingIdentity?: string;
}

export interface CollectedPushCandidates {
  candidates: PushCandidate[];
  skipped: SkippedPushInput[];
}

async function readUtf8IfPresent(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export class CanonicalConflictError extends Error {
  readonly sourcePath: string;
  readonly tools: string[];

  constructor(sourcePath: string, tools: string[]) {
    super(`Canonical content conflict for ${sourcePath} across tools: ${tools.join(', ')}`);
    this.name = 'CanonicalConflictError';
    this.sourcePath = sourcePath;
    this.tools = tools;
  }
}

export async function matchesPushedCommit(
  cacheDir: string,
  projectPath: string,
  proposal: Pick<PendingProposal, 'canonicalPath' | 'pushed'>,
  canonicalContent: string,
): Promise<boolean> {
  if (!proposal.pushed) {
    return false;
  }
  const previouslyPushed = await import('./git.js').then((git) =>
    git.showFileAtCommit(
      proposal.pushed!.commit,
      path.posix.join(projectPath.replace(/\\/g, '/'), proposal.canonicalPath),
      { cwd: cacheDir },
    ),
  );
  return (
    previouslyPushed !== null &&
    previouslyPushed.replace(/\r\n/g, '\n').trimEnd() ===
      canonicalContent.replace(/\r\n/g, '\n').trimEnd()
  );
}

export interface ToolParseResult {
  tool: string;
  canonicalContent: string;
  targetOverrides?: Record<string, unknown>;
  bundleFiles?: BundleFile[];
}

/**
 * Merge reverse-render results from multiple tools.
 * Returns merged overrides, or lists tools that disagree on canonical content.
 * For `type=skill` bundles, accompanying files are deduped by relative path when
 * content matches; a same-path content mismatch fails the merge (no silent pick).
 */
export function mergeMultiToolParseResults(
  results: ToolParseResult[],
):
  | {
      ok: true;
      canonicalContent: string;
      targetOverrides: Record<string, Record<string, unknown>>;
      bundleFiles?: BundleFile[];
    }
  | { ok: false; tools: string[] } {
  if (results.length === 0) {
    return { ok: false, tools: [] };
  }
  const canonicalContent = results[0]!.canonicalContent;
  const conflicting = results
    .filter((r) => r.canonicalContent !== canonicalContent)
    .map((r) => r.tool);
  if (conflicting.length > 0) {
    const tools = [results[0]!.tool, ...conflicting];
    return { ok: false, tools: [...new Set(tools)] };
  }
  const targetOverrides: Record<string, Record<string, unknown>> = {};
  for (const result of results) {
    targetOverrides[result.tool] = result.targetOverrides ?? {};
  }
  const bundleFiles = mergeBundleFiles(results);
  return { ok: true, canonicalContent, targetOverrides, ...(bundleFiles ? { bundleFiles } : {}) };
}

function mergeBundleFiles(results: ToolParseResult[]): BundleFile[] | undefined {
  const withBundles = results.filter((r) => r.bundleFiles && r.bundleFiles.length > 0);
  if (withBundles.length === 0) {
    return undefined;
  }
  const byPath = new Map<string, string>();
  for (const result of withBundles) {
    for (const file of result.bundleFiles!) {
      const existing = byPath.get(file.relativePath);
      if (existing !== undefined && existing !== file.content) {
        throw new CanonicalConflictError(file.relativePath, withBundles.map((r) => r.tool));
      }
      byPath.set(file.relativePath, file.content);
    }
  }
  return [...byPath.entries()].map(([relativePath, content]) => ({ relativePath, content }));
}

export async function collectEditCandidates(
  projectDir: string,
  binding: Binding,
): Promise<PushCandidate[]> {
  return (await collectEditCandidatesWithSkipped(projectDir, binding)).candidates;
}

export async function collectEditCandidatesWithSkipped(
  projectDir: string,
  binding: Binding,
  proposals: PendingProposal[] = [],
): Promise<CollectedPushCandidates> {
  const candidates: PushCandidate[] = [];
  const skipped: SkippedPushInput[] = [];
  const writableProjects = new Set(
    binding.projects.filter((p) => p.mode === 'linked').map((p) => p.name),
  );
  const subscribedProjects = new Set(
    binding.projects.filter((p) => p.mode === 'subscribed').map((p) => p.name),
  );
  const authorizedModules = new Set(
    proposals
      .filter((proposal) => proposal.targetRole === 'shared' && proposal.remote === binding.remote)
      .map((proposal) => `${proposal.project}\u0000${proposal.type}\u0000${proposal.canonicalPath}`),
  );
  const eligible: ManagedArtifact[] = [];

  for (const artifact of binding.artifacts) {
    const moduleAuthorized =
      subscribedProjects.has(artifact.project) &&
      authorizedModules.has(`${artifact.project}\u0000${artifact.type}\u0000${artifact.sourcePath}`);
    if (!writableProjects.has(artifact.project) && !moduleAuthorized) {
      continue;
    }
    const toolsWithPaths = binding.tools.filter(
      (tool) => (artifact.installedPaths[tool]?.length ?? 0) > 0,
    );
    if (toolsWithPaths.length === 0) {
      continue;
    }
    const allPaths = toolsWithPaths.flatMap((tool) => artifact.installedPaths[tool] ?? []);
    const missingPaths: string[] = [];
    for (const installedPath of allPaths) {
      if (!(await pathExists(path.join(projectDir, installedPath)))) {
        missingPaths.push(installedPath);
      }
    }
    if (missingPaths.length > 0) {
      skipped.push({ sourcePath: artifact.sourcePath, kind: 'binding', missingPaths });
      continue;
    }
    eligible.push(artifact);
  }

  if (eligible.length === 0) {
    return { candidates, skipped };
  }

  const eligiblePaths = eligible.flatMap((artifact) =>
    binding.tools.flatMap((tool) => artifact.installedPaths[tool] ?? []),
  );
  const dirty = new Set(await listDirtyPaths(projectDir, eligiblePaths));
  const dirtyArtifacts = eligible.filter((artifact) =>
    binding.tools
      .flatMap((tool) => artifact.installedPaths[tool] ?? [])
      .some((installedPath) => dirty.has(installedPath)),
  );
  if (dirtyArtifacts.length === 0) {
    return { candidates, skipped };
  }

  const cacheDir = await ensureRemoteCache(binding.remote, { force: true });
  const manifest = await readManifest(cacheDir);
  for (const artifact of dirtyArtifacts) {
    const { project } = resolveConventions(manifest, artifact.project);
    const toolsWithPaths = binding.tools.filter(
      (tool) => (artifact.installedPaths[tool]?.length ?? 0) > 0,
    );
    const allPaths = toolsWithPaths.flatMap((tool) => artifact.installedPaths[tool] ?? []);
    const isDirty = allPaths.some((p) => dirty.has(p));
    if (!isDirty) {
      continue;
    }

    const parseResults: ToolParseResult[] = [];
    let missingDuringRead: string[] = [];
    for (const tool of toolsWithPaths) {
      const adapter = getAdapter(tool);
      if (!adapter) {
        continue;
      }
      const paths = artifact.installedPaths[tool] ?? [];
      const files: Array<{ path: string; content: string }> = [];
      for (const relativePath of paths) {
        const content = await readUtf8IfPresent(path.join(projectDir, relativePath));
        if (content === null) {
          missingDuringRead.push(relativePath);
        } else {
          files.push({ path: relativePath, content });
        }
      }
      if (missingDuringRead.length > 0) {
        break;
      }
      let parseFiles = files;
      if (adapter.discoverExisting) {
        const sourceId = toSlug(artifact.sourcePath);
        const discovered = (await adapter.discoverExisting(projectDir)).find(
          (item) =>
            item.slug === sourceId &&
            item.type === artifact.type &&
            item.sourceFiles
              .map((source) => source.replace(/\\/g, '/'))
              .sort()
              .join('\u0000') ===
              paths.map((source) => source.replace(/\\/g, '/')).sort().join('\u0000'),
        );
        if (discovered) {
          parseFiles = discovered.files;
        }
      }
      const parsed = adapter.parseExisting(parseFiles);
      parseResults.push({
        tool,
        canonicalContent: parsed.canonicalContent,
        targetOverrides: parsed.targetOverrides,
        ...(parsed.bundleFiles ? { bundleFiles: parsed.bundleFiles } : {}),
      });
    }
    if (missingDuringRead.length > 0) {
      skipped.push({
        sourcePath: artifact.sourcePath,
        kind: 'binding',
        missingPaths: missingDuringRead,
      });
      continue;
    }

    const merged = mergeMultiToolParseResults(parseResults);
    if (!merged.ok) {
      throw new CanonicalConflictError(artifact.sourcePath, merged.tools);
    }
    const moduleTracking = proposals.find(
      (proposal) =>
        proposal.targetRole === 'shared' &&
        proposal.remote === binding.remote &&
        proposal.project === artifact.project &&
        proposal.type === artifact.type &&
        proposal.canonicalPath === artifact.sourcePath,
    );
    if (
      moduleTracking &&
      (await matchesPushedCommit(cacheDir, project.path, moduleTracking, merged.canonicalContent))
    ) {
      continue;
    }

    candidates.push({
      sourcePath: artifact.sourcePath,
      sourceFiles: allPaths,
      canonicalPath: artifact.sourcePath,
      type: artifact.type,
      optional: artifact.optional,
      canonicalContent: merged.canonicalContent,
      targetOverrides: merged.targetOverrides,
      ...(merged.bundleFiles ? { bundleFiles: merged.bundleFiles } : {}),
      projectPath: project.path,
      remote: binding.remote,
      project: artifact.project,
      kind: writableProjects.has(artifact.project) ? 'binding' : 'module-contribution',
      ...(writableProjects.has(artifact.project)
        ? {}
        : {
            trackingIdentity: contributionSourceIdentity(
              moduleTracking!,
            ),
          }),
    });
  }
  return { candidates, skipped };
}

export async function collectProposalCandidates(
  projectDir: string,
  proposals: PendingProposal[],
): Promise<PushCandidate[]> {
  return (await collectProposalCandidatesWithSkipped(projectDir, proposals)).candidates;
}

export async function collectProposalCandidatesWithSkipped(
  projectDir: string,
  proposals: PendingProposal[],
): Promise<CollectedPushCandidates> {
  const candidates: PushCandidate[] = [];
  const skipped: SkippedPushInput[] = [];
  for (const proposal of proposals) {
    const adapter = getAdapter(proposal.tool);
    if (!adapter) {
      continue;
    }
    const missingPaths: string[] = [];
    const files: Array<{ path: string; content: string }> = [];
    for (const sourceFile of proposal.sourceFiles) {
      const content = await readUtf8IfPresent(path.join(projectDir, sourceFile));
      if (content === null) {
        missingPaths.push(sourceFile);
      } else {
        files.push({ path: sourceFile, content });
      }
    }
    if (missingPaths.length > 0) {
      skipped.push({
        sourcePath: proposal.localPath,
        kind: 'proposal',
        missingPaths,
        trackingIdentity: contributionSourceIdentity(proposal),
      });
      continue;
    }
    let parseFiles = files;
    if (adapter.discoverExisting) {
      const discovered = (await adapter.discoverExisting(projectDir)).find(
        (item) =>
          item.slug === proposal.sourceId &&
          item.type === proposal.type &&
          item.sourceFiles.map((source) => source.replace(/\\/g, '/')).sort().join('\u0000') ===
            proposal.sourceFiles.map((source) => source.replace(/\\/g, '/')).sort().join('\u0000'),
      );
      if (discovered) {
        parseFiles = discovered.files;
      }
    }
    const parsed = adapter.parseExisting(parseFiles);
    const cacheDir = await ensureRemoteCache(proposal.remote, { force: true });
    const manifest = await readManifest(cacheDir);
    const { project } = resolveConventions(manifest, proposal.project);
    if (await matchesPushedCommit(cacheDir, project.path, proposal, parsed.canonicalContent)) {
      continue;
    }
    const bundleFiles =
      proposal.type === 'skill'
        ? parsed.bundleFiles ?? [{ relativePath: 'SKILL.md', content: parsed.canonicalContent } as BundleFile]
        : undefined;
    candidates.push({
      sourcePath: proposal.canonicalPath,
      sourceFiles: proposal.sourceFiles,
      canonicalPath: proposal.canonicalPath,
      type: proposal.type,
      optional: proposal.optional,
      canonicalContent: parsed.canonicalContent,
      targetOverrides: {
        [proposal.tool]: parsed.targetOverrides ?? {},
      },
      ...(bundleFiles ? { bundleFiles } : {}),
      projectPath: project.path,
      remote: proposal.remote,
      project: proposal.project,
      kind: proposal.targetRole === 'shared' ? 'module-contribution' : 'proposal',
      trackingIdentity: contributionSourceIdentity(proposal),
    });
  }
  return { candidates, skipped };
}

export function buildCompareUrl(remoteUrl: string, base: string, head: string): string {
  const normalized = remoteUrl.replace(/\.git$/, '');
  if (normalized.includes('github.com')) {
    const repo = normalized.replace(/^git@github\.com:/, 'https://github.com/').replace(/^https:\/\/github\.com\//, '');
    return `https://github.com/${repo}/compare/${base}...${head}?expand=1`;
  }
  if (normalized.includes('gitlab.com')) {
    const repo = normalized
      .replace(/^git@gitlab\.com:/, 'https://gitlab.com/')
      .replace(/^https:\/\/gitlab\.com\//, '');
    return `https://gitlab.com/${repo}/-/merge_requests/new?merge_request[source_branch]=${head}&merge_request[target_branch]=${base}`;
  }
  return `${normalized}/compare/${base}...${head}`;
}

export interface PushResult {
  branch: string;
  commit: string;
  baseBranch: string;
  baseCommit: string;
  compareUrl: string;
  directPush: boolean;
}

export async function executePush(
  binding: Binding,
  candidates: PushCandidate[],
  message: string,
): Promise<PushResult> {
  const remote = await getRemote(binding.remote);
  if (!remote) {
    throw new Error(`Remote not found: ${binding.remote}`);
  }
  const cacheDir = await ensureRemoteCache(binding.remote, { force: true });
  await runGit(['checkout', binding.branch], { cwd: cacheDir });
  await runGit(['pull', '--ff-only', 'origin', binding.branch], { cwd: cacheDir }).catch(() => undefined);
  const baseCommit = await remoteBranchCommit(cacheDir, binding.branch);

  const directPush = Boolean(remote.directPush);
  const branch = directPush
    ? binding.branch
    : `imwel-push-${Date.now().toString(36)}`;

  if (!directPush) {
    await runGit(['checkout', '-b', branch], { cwd: cacheDir });
  }

  for (const candidate of candidates) {
    if (candidate.type === 'skill' && candidate.bundleFiles && candidate.bundleFiles.length > 0) {
      assertBundlePathsSafe(candidate.bundleFiles);
      const skillDir = candidate.canonicalPath.replace(/\\/g, '/').replace(/\/$/, '');
      for (const bundleFile of candidate.bundleFiles) {
        const dest = path.posix.join(
          candidate.projectPath.replace(/\\/g, '/'),
          skillDir,
          bundleFile.relativePath.replace(/\\/g, '/'),
        );
        const abs = path.join(cacheDir, dest);
        await fs.mkdir(path.dirname(abs), { recursive: true });
        await fs.writeFile(abs, bundleFile.content, 'utf8');
        await runGit(['add', '--', dest], { cwd: cacheDir });
      }
      continue;
    }
    const dest = path.posix.join(
      candidate.projectPath.replace(/\\/g, '/'),
      candidate.canonicalPath.replace(/\\/g, '/'),
    );
    const abs = path.join(cacheDir, dest);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, candidate.canonicalContent, 'utf8');
    await runGit(['add', '--', dest], { cwd: cacheDir });
  }

  const status = await runGit(['status', '--porcelain'], { cwd: cacheDir });
  if (!status.stdout.trim()) {
    throw new Error('No changes to push');
  }
  await runGit(['commit', '-m', message], { cwd: cacheDir });
  const commit = (await runGit(['rev-parse', 'HEAD'], { cwd: cacheDir })).stdout.trim();

  if (directPush) {
    await runGit(['push', 'origin', binding.branch], { cwd: cacheDir });
  } else {
    await runGit(['push', '-u', 'origin', branch], { cwd: cacheDir });
  }

  return {
    branch,
    commit,
    baseBranch: binding.branch,
    baseCommit: directPush ? commit : baseCommit,
    compareUrl: buildCompareUrl(remote.url, binding.branch, branch),
    directPush,
  };
}

export function shouldUseDirectPush(remoteDirectPush: boolean | undefined): boolean {
  return Boolean(remoteDirectPush);
}
