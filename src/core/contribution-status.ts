import fs from 'node:fs/promises';
import path from 'node:path';
import { getAdapter } from '../adapters/index.js';
import type { ArtifactType } from './artifact-types.js';
import { pathExists } from './fs-utils.js';
import { remoteCacheDir } from './paths.js';
import type { PendingProposal } from './propose.js';
import {
  artifactMatchesAtCommit,
  matchesRemoteHead,
} from './push.js';
import { readManifest, resolveConventions } from './manifest.js';

export type ContributionLifecycleStatus =
  | 'pending'
  | 'pushed'
  | 'clean'
  | 'modified'
  | 'missing';

/**
 * Resolve contribution lifecycle status using local sources and an existing
 * remote cache when present (no network fetch).
 */
export async function resolveContributionLifecycleStatus(
  projectDir: string,
  proposal: PendingProposal,
): Promise<ContributionLifecycleStatus> {
  for (const sourceFile of proposal.sourceFiles) {
    if (!(await pathExists(path.join(projectDir, sourceFile)))) {
      return 'missing';
    }
  }
  if (!proposal.pushed) {
    return 'pending';
  }

  const adapter = getAdapter(proposal.tool);
  if (!adapter) {
    return 'pushed';
  }

  const files: Array<{ path: string; content: string }> = [];
  for (const sourceFile of proposal.sourceFiles) {
    files.push({
      path: sourceFile,
      content: await fs.readFile(path.join(projectDir, sourceFile), 'utf8'),
    });
  }
  let parseFiles = files;
  if (adapter.discoverExisting) {
    const discovered = (await adapter.discoverExisting(projectDir)).find(
      (item) =>
        item.slug === proposal.sourceId &&
        item.type === proposal.type &&
        item.sourceFiles
          .map((source) => source.replace(/\\/g, '/'))
          .sort()
          .join('\u0000') ===
          proposal.sourceFiles.map((source) => source.replace(/\\/g, '/')).sort().join('\u0000'),
    );
    if (discovered) {
      parseFiles = discovered.files;
    }
  }
  const parsed = adapter.parseExisting(parseFiles);
  const bundleFiles =
    proposal.type === 'skill'
      ? parsed.bundleFiles ?? [
          { relativePath: 'SKILL.md', content: parsed.canonicalContent },
        ]
      : parsed.bundleFiles;

  const cacheDir = remoteCacheDir(proposal.remote);
  if (!(await pathExists(path.join(cacheDir, '.git')))) {
    return 'pushed';
  }

  let projectPath = '';
  try {
    const manifest = await readManifest(cacheDir);
    projectPath = resolveConventions(manifest, proposal.project).project.path;
  } catch {
    return 'pushed';
  }

  const branch = proposal.baseBranch ?? 'main';
  try {
    if (
      await matchesRemoteHead(
        cacheDir,
        branch,
        projectPath,
        proposal.canonicalPath,
        proposal.type as ArtifactType,
        parsed.canonicalContent,
        bundleFiles,
      )
    ) {
      return 'clean';
    }
  } catch {
    // Cache may lack origin/<branch>; fall through.
  }

  if (
    await artifactMatchesAtCommit(
      cacheDir,
      proposal.pushed.commit,
      projectPath,
      proposal.canonicalPath,
      proposal.type as ArtifactType,
      parsed.canonicalContent,
      bundleFiles,
    )
  ) {
    return 'pushed';
  }
  return 'modified';
}
