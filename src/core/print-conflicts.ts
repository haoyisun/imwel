import posix from 'node:path/posix';
import type { PathConflict } from '../adapters/strategies/dedupe.js';
import { t } from '../locales/index.js';

/**
 * Print render-path conflicts. When a conflict spans more than one source
 * project, the message names those projects and, when the originating source
 * artifact path is known, gives a directly-actionable rename hint (prefix the
 * source file/dir with its project name) so the user can fix it at the source.
 */
export function printPathConflicts(conflicts: PathConflict[]): void {
  for (const conflict of conflicts) {
    if (conflict.projects.length > 1) {
      const renameHint = buildRenameHint(conflict);
      console.error(
        t('adapter.pathConflict.sources', {
          path: conflict.path,
          sources: conflict.projects.join(', '),
          renameHint,
        }),
      );
    } else {
      console.error(
        t('adapter.pathConflict', {
          path: conflict.path,
          tools: conflict.adapterIds.join(', '),
        }),
      );
    }
  }
  console.error(t('adapter.pathConflict.hint'));
}

/**
 * Build a concrete rename hint from the first known source artifact, e.g.
 * "in project `python-std`, rename `rules/coding-style.md` to
 * `rules/python-std-coding-style.md`". Returns an empty string when no source
 * artifact path is recorded (caller falls back to the generic message).
 */
function buildRenameHint(conflict: PathConflict): string {
  const first = conflict.sourceArtifacts[0];
  if (!first) {
    return '';
  }
  const normalized = first.sourcePath.replace(/\\/g, '/');
  const isSkill = !normalized.endsWith('.md');
  const dir = posix.dirname(normalized);
  const base = posix.basename(normalized);
  const stem = isSkill ? base : base.replace(/\.[^.]+$/, '');
  const renamed = isSkill ? `${first.project}-${stem}` : `${first.project}-${stem}.md`;
  const fromPath = dir === '.' ? base : `${dir}/${base}`;
  const toPath = dir === '.' ? renamed : `${dir}/${renamed}`;
  return t('adapter.pathConflict.renameHint', {
    project: first.project,
    from: fromPath,
    to: toPath,
  });
}
