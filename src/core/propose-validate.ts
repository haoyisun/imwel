import type { ArtifactType } from './artifact-types.js';
import type { BundleFile } from './artifact-types.js';
import type { ManifestConventions } from './manifest.js';

export interface ProposePathValidation {
  ok: boolean;
  /** Convention field that was violated when ok is false. */
  expected?: string;
}

/**
 * Reject bundle file relative paths that could escape the skill directory on
 * write (absolute paths, drive letters, or `..` segments). Keeps the write
 * target inside `skills/<slug>/` per the AGENTS.md safety defaults.
 */
export function isSafeBundleRelativePath(relativePath: string): boolean {
  const posix = relativePath.replace(/\\/g, '/');
  if (posix === '' || posix.startsWith('/')) {
    return false;
  }
  if (/^[a-zA-Z]:/.test(posix)) {
    return false;
  }
  const segments = posix.split('/');
  return segments.every((seg) => seg !== '..' && seg !== '.');
}

/** Throw if any bundle file has an unsafe relative path. */
export function assertBundlePathsSafe(bundleFiles: BundleFile[]): void {
  for (const file of bundleFiles) {
    if (!isSafeBundleRelativePath(file.relativePath)) {
      throw new Error(
        `Refusing to write skill bundle file with unsafe relative path: ${file.relativePath}`,
      );
    }
  }
}

/**
 * Validate that a local/source path matches the target project's effective conventions
 * for the chosen artifact type (rulesDir / skillsDir / agentsFile).
 */
export function validateProposalPath(
  localPath: string,
  type: ArtifactType,
  conventions: ManifestConventions,
): ProposePathValidation {
  const normalized = localPath.replace(/\\/g, '/').replace(/^\.\//, '');

  if (type === 'rule') {
    const dir = conventions.rulesDir.replace(/\\/g, '/').replace(/\/$/, '');
    if (normalized === dir || normalized.startsWith(`${dir}/`)) {
      return { ok: true };
    }
    return { ok: false, expected: dir };
  }

  if (type === 'skill') {
    const dir = conventions.skillsDir.replace(/\\/g, '/').replace(/\/$/, '');
    if (normalized === dir || normalized.startsWith(`${dir}/`)) {
      return { ok: true };
    }
    return { ok: false, expected: dir };
  }

  if (type === 'agents') {
    const file = conventions.agentsFile.replace(/\\/g, '/').replace(/^\.\//, '');
    if (normalized === file) {
      return { ok: true };
    }
    return { ok: false, expected: file };
  }

  return { ok: false, expected: type };
}
