import type { ArtifactType } from './artifact-types.js';
import type { ManifestConventions } from './manifest.js';

export interface ProposePathValidation {
  ok: boolean;
  /** Convention field that was violated when ok is false. */
  expected?: string;
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
