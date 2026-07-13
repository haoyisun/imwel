import path from 'node:path';
import { adapters, getAdapter } from '../adapters/index.js';
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

export function renderArtifacts(
  artifacts: Artifact[],
  tools: string[],
  existingOverrides?: Map<string, Record<string, Record<string, unknown>>>,
): { files: RenderedFileWrite[]; managed: ManagedArtifact[] } {
  const files: RenderedFileWrite[] = [];
  const managed: ManagedArtifact[] = [];

  for (const artifact of artifacts) {
    const installedPaths: Record<string, string[]> = {};
    const targetOverrides: Record<string, Record<string, unknown>> = {};
    for (const tool of tools) {
      const adapter = getAdapter(tool);
      if (!adapter) {
        continue;
      }
      const overrides = existingOverrides?.get(artifact.sourcePath)?.[tool];
      const rendered = adapter.render(artifact, overrides);
      for (const file of rendered) {
        files.push(file);
        installedPaths[tool] = [...(installedPaths[tool] ?? []), file.path];
      }
      if (overrides) {
        targetOverrides[tool] = overrides;
      }
    }
    managed.push({
      sourcePath: artifact.sourcePath,
      type: artifact.type,
      optional: artifact.optional,
      localEdit: false,
      installedPaths,
      targetOverrides: Object.keys(targetOverrides).length ? targetOverrides : undefined,
    });
  }
  return { files, managed };
}

export function sourcePathsForProject(projectPath: string, sourcePath: string): string {
  return path.posix.join(projectPath.replace(/\\/g, '/'), sourcePath);
}
