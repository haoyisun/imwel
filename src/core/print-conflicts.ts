import type { PathConflict } from '../adapters/strategies/dedupe.js';
import { t } from '../locales/index.js';

/**
 * Print render-path conflicts. When a conflict spans more than one source
 * project, the message names those projects so the user can tell a real
 * cross-project name collision apart from a same-project multi-tool mismatch.
 */
export function printPathConflicts(conflicts: PathConflict[]): void {
  for (const conflict of conflicts) {
    if (conflict.projects.length > 1) {
      console.error(
        t('adapter.pathConflict.sources', {
          path: conflict.path,
          sources: conflict.projects.join(', '),
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
