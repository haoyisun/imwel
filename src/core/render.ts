import path from 'node:path';
import { adapters, getAdapter } from '../adapters/index.js';
import { dedupeRenderedFiles, type PathConflict } from '../adapters/strategies/dedupe.js';
import type { Artifact } from './artifact-types.js';
import type { RenderedFileWrite } from './apply-files.js';
import type { ManagedArtifact } from './binding.js';

export async function detectTools(projectDir: string): Promise<string[]> {
  const detected: string[] = [];
  for (const adapter of adapters) {
    if (await adapter.detect(projectDir)) {
      detected.push(adapter.id);
    }
  }
  return detected;
}

export interface RenderArtifactsResult {
  files: RenderedFileWrite[];
  managed: ManagedArtifact[];
  conflicts: PathConflict[];
  warningLocaleKeys: string[];
}

export function renderArtifacts(
  artifacts: Artifact[],
  tools: string[],
  existingOverrides?: Map<string, Record<string, Record<string, unknown>>>,
): RenderArtifactsResult {
  const rawFiles: RenderedFileWrite[] = [];
  const managed: ManagedArtifact[] = [];

  for (const artifact of artifacts) {
    const installedPaths: Record<string, string[]> = {};
    const targetOverrides: Record<string, Record<string, unknown>> = {};
    // Author-declared overlay (from the artifact's frontmatter) is the cross-tool
    // default; a consumer's per-tool override takes precedence over it. Only the
    // consumer override is recorded in the binding so future author-default
    // changes keep propagating on re-sync.
    const authorDefault = artifact.targetOverrides as Record<string, unknown> | undefined;
    for (const tool of tools) {
      const adapter = getAdapter(tool);
      if (!adapter) {
        continue;
      }
      const consumerOverride = existingOverrides?.get(artifact.sourcePath)?.[tool];
      const renderOverrides =
        authorDefault || consumerOverride
          ? { ...(authorDefault ?? {}), ...(consumerOverride ?? {}) }
          : undefined;
      const rendered = adapter.render(artifact, renderOverrides);
      for (const file of rendered) {
        rawFiles.push({ ...file, sourceAdapterId: tool, sourceProject: artifact.project });
        installedPaths[tool] = [...(installedPaths[tool] ?? []), file.path];
      }
      if (consumerOverride) {
        targetOverrides[tool] = consumerOverride;
      }
    }
    managed.push({
      sourcePath: artifact.sourcePath,
      project: artifact.project ?? '',
      type: artifact.type,
      optional: artifact.optional,
      localEdit: false,
      installedPaths,
      targetOverrides: Object.keys(targetOverrides).length ? targetOverrides : undefined,
    });
  }

  const { files, conflicts, warningLocaleKeys } = dedupeRenderedFiles(rawFiles);

  if (conflicts.length) {
    const conflictKeys = new Set(conflicts.map((c) => c.key));
    for (const entry of managed) {
      for (const tool of Object.keys(entry.installedPaths)) {
        entry.installedPaths[tool] = (entry.installedPaths[tool] ?? []).filter((p) => {
          const matching = rawFiles.filter(
            (f) => f.path === p && f.sourceAdapterId === tool,
          );
          return matching.every((f) => {
            const key =
              f.merge === 'upsert-block' && f.blockId ? `${f.path}#${f.blockId}` : f.path;
            return !conflictKeys.has(key);
          });
        });
      }
    }
  }

  return { files, managed, conflicts, warningLocaleKeys };
}

export function sourcePathsForProject(projectPath: string, sourcePath: string): string {
  return path.posix.join(projectPath.replace(/\\/g, '/'), sourcePath);
}
