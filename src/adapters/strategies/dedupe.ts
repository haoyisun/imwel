import type { RenderedFileWrite } from '../../core/apply-files.js';

export interface PathConflict {
  path: string;
  /** Grouping key (path or path#blockId). */
  key: string;
  adapterIds: string[];
  /** Distinct source projects contributing to the conflict (cross-source). */
  projects: string[];
  /**
   * Distinct (project, sourcePath) pairs contributing to the conflict, used to
   * build an actionable rename hint. Empty when source paths were not recorded.
   */
  sourceArtifacts: { project: string; sourcePath: string }[];
}

export interface DedupedRenderFiles {
  files: RenderedFileWrite[];
  conflicts: PathConflict[];
  warningLocaleKeys: string[];
}

interface TrackedFile {
  path: string;
  content: string;
  merge?: RenderedFileWrite['merge'];
  blockId?: string;
  warningLocaleKey?: string;
  sourceAdapterId: string;
  sourceProject?: string;
  sourceArtifactPath?: string;
}

function groupKey(file: RenderedFileWrite): string {
  if (file.merge === 'upsert-block' && file.blockId) {
    return `${file.path}#${file.blockId}`;
  }
  return file.path;
}

/**
 * Deduplicate rendered files before write:
 * - identical content for same key → keep one (silent)
 * - conflicting content → omit all for that key and report conflict
 * upsert-block entries with different blockIds on the same path are kept separately.
 */
export function dedupeRenderedFiles(
  files: Array<RenderedFileWrite & { sourceAdapterId?: string }>,
): DedupedRenderFiles {
  const groups = new Map<string, TrackedFile[]>();
  const warningLocaleKeys = new Set<string>();

  for (const file of files) {
    if (file.warningLocaleKey) {
      warningLocaleKeys.add(file.warningLocaleKey);
    }
    const key = groupKey(file);
    const tracked: TrackedFile = {
      path: file.path,
      content: file.content,
      merge: file.merge,
      blockId: file.blockId,
      warningLocaleKey: file.warningLocaleKey,
      sourceAdapterId: file.sourceAdapterId ?? 'unknown',
      sourceProject: file.sourceProject,
      sourceArtifactPath: file.sourceArtifactPath,
    };
    const list = groups.get(key) ?? [];
    list.push(tracked);
    groups.set(key, list);
  }

  const out: RenderedFileWrite[] = [];
  const conflicts: PathConflict[] = [];

  for (const [key, group] of groups) {
    const first = group[0]!;
    const allSame = group.every((f) => f.content === first.content && f.merge === first.merge);
    if (allSame) {
      out.push({
        path: first.path,
        content: first.content,
        merge: first.merge,
        blockId: first.blockId,
        warningLocaleKey: first.warningLocaleKey,
      });
      continue;
    }
    conflicts.push({
      path: first.path,
      key,
      adapterIds: [...new Set(group.map((f) => f.sourceAdapterId))],
      projects: [...new Set(group.map((f) => f.sourceProject).filter((x): x is string => Boolean(x)))],
      sourceArtifacts: [
        ...new Map(
          group
            .filter((f) => f.sourceProject && f.sourceArtifactPath)
            .map((f) => [`${f.sourceProject}\u0000${f.sourceArtifactPath}`, {
              project: f.sourceProject!,
              sourcePath: f.sourceArtifactPath!,
            }]),
        ).values(),
      ],
    });
  }

  return {
    files: out,
    conflicts,
    warningLocaleKeys: [...warningLocaleKeys],
  };
}
