import fs from 'node:fs/promises';
import path from 'node:path';
import { getAdapter } from '../adapters/index.js';
import { getRemote } from './config.js';
import type { Binding, ManagedArtifact } from './binding.js';
import { listDirtyPaths } from './history.js';
import { collectInstalledPaths } from './history.js';
import { ensureRemoteCache } from './remote-cache.js';
import { runGit } from './git.js';
import type { PendingProposal } from './propose.js';
import { resolveConventions, readManifest } from './manifest.js';

export interface PushCandidate {
  sourcePath: string;
  type: ManagedArtifact['type'];
  optional: boolean;
  canonicalContent: string;
  targetOverrides?: Record<string, Record<string, unknown>>;
  projectPath: string;
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

export interface ToolParseResult {
  tool: string;
  canonicalContent: string;
  targetOverrides?: Record<string, unknown>;
}

/**
 * Merge reverse-render results from multiple tools.
 * Returns merged overrides, or lists tools that disagree on canonical content.
 */
export function mergeMultiToolParseResults(
  results: ToolParseResult[],
):
  | { ok: true; canonicalContent: string; targetOverrides: Record<string, Record<string, unknown>> }
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
  return { ok: true, canonicalContent, targetOverrides };
}

export async function collectEditCandidates(
  projectDir: string,
  binding: Binding,
): Promise<PushCandidate[]> {
  const candidates: PushCandidate[] = [];
  const manifest = await readManifest(await ensureRemoteCache(binding.remote, { force: true }));
  const { project } = resolveConventions(manifest, binding.project);
  const dirty = new Set(await listDirtyPaths(projectDir, collectInstalledPaths(binding)));

  for (const artifact of binding.artifacts) {
    const toolsWithPaths = binding.tools.filter(
      (tool) => (artifact.installedPaths[tool]?.length ?? 0) > 0,
    );
    if (toolsWithPaths.length === 0) {
      continue;
    }
    const allPaths = toolsWithPaths.flatMap((tool) => artifact.installedPaths[tool] ?? []);
    const isDirty = allPaths.some((p) => dirty.has(p));
    if (!isDirty) {
      continue;
    }

    const parseResults: ToolParseResult[] = [];
    for (const tool of toolsWithPaths) {
      const adapter = getAdapter(tool);
      if (!adapter) {
        continue;
      }
      const paths = artifact.installedPaths[tool] ?? [];
      const files = await Promise.all(
        paths.map(async (rel) => ({
          path: rel,
          content: await fs.readFile(path.join(projectDir, rel), 'utf8'),
        })),
      );
      const parsed = adapter.parseExisting(files);
      parseResults.push({
        tool,
        canonicalContent: parsed.canonicalContent,
        targetOverrides: parsed.targetOverrides,
      });
    }

    const merged = mergeMultiToolParseResults(parseResults);
    if (!merged.ok) {
      throw new CanonicalConflictError(artifact.sourcePath, merged.tools);
    }

    candidates.push({
      sourcePath: artifact.sourcePath,
      type: artifact.type,
      optional: artifact.optional,
      canonicalContent: merged.canonicalContent,
      targetOverrides: merged.targetOverrides,
      projectPath: project.path,
    });
  }
  return candidates;
}

export async function collectProposalCandidates(
  projectDir: string,
  proposals: PendingProposal[],
): Promise<PushCandidate[]> {
  const candidates: PushCandidate[] = [];
  for (const proposal of proposals) {
    const adapter = getAdapter(proposal.tool);
    if (!adapter) {
      continue;
    }
    const abs = path.join(projectDir, proposal.localPath);
    const content = await fs.readFile(abs, 'utf8');
    const parsed = adapter.parseExisting([{ path: proposal.localPath, content }]);
    const manifest = await readManifest(await ensureRemoteCache(proposal.remote, { force: true }));
    const { project } = resolveConventions(manifest, proposal.project);
    candidates.push({
      sourcePath: proposal.localPath,
      type: proposal.type,
      optional: proposal.optional,
      canonicalContent: parsed.canonicalContent,
      targetOverrides: {
        [proposal.tool]: parsed.targetOverrides ?? {},
      },
      projectPath: project.path,
    });
  }
  return candidates;
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

  const directPush = Boolean(remote.directPush);
  const branch = directPush
    ? binding.branch
    : `imwel-push-${Date.now().toString(36)}`;

  if (!directPush) {
    await runGit(['checkout', '-b', branch], { cwd: cacheDir });
  }

  for (const candidate of candidates) {
    const dest = path.posix.join(
      candidate.projectPath.replace(/\\/g, '/'),
      candidate.sourcePath.replace(/\\/g, '/'),
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

  if (directPush) {
    await runGit(['push', 'origin', binding.branch], { cwd: cacheDir });
  } else {
    await runGit(['push', '-u', 'origin', branch], { cwd: cacheDir });
  }

  return {
    branch,
    compareUrl: buildCompareUrl(remote.url, binding.branch, branch),
    directPush,
  };
}

export function shouldUseDirectPush(remoteDirectPush: boolean | undefined): boolean {
  return Boolean(remoteDirectPush);
}
