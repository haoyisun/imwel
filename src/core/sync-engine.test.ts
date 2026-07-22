import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { planRemovals, type SyncPlan } from './sync-engine.js';
import type { Binding, ManagedArtifact } from './binding.js';

function artifact(project: string, sourcePath: string): ManagedArtifact {
  return { project, sourcePath, type: 'rule', optional: false, localEdit: false, installedPaths: {} };
}

describe('planRemovals', () => {
  it('matches on the (project, sourcePath) key, not sourcePath alone', () => {
    const plan: SyncPlan = {
      items: [{ project: 'a', sourcePath: 'rules/shared.md', status: 'removed' }],
      artifacts: [],
      remoteCommit: 'HEAD',
    };
    const binding: Binding = {
      remote: 'r',
      branch: 'main',
      projects: [
        { name: 'a', mode: 'subscribed' },
        { name: 'b', mode: 'linked' },
      ],
      tools: ['cursor'],
      lastSyncedCommit: 'x',
      lastSyncedHistoryCommit: 'y',
      artifacts: [artifact('a', 'rules/shared.md'), artifact('b', 'rules/shared.md')],
    };
    const removed = planRemovals(plan, binding);
    // Only project "a"'s copy is removed; project "b"'s same-named file survives.
    assert.equal(removed.length, 1);
    assert.equal(removed[0]!.project, 'a');
  });
});
