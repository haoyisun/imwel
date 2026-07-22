import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  managedPathsMissingFromCommit,
  pruneBindingToCommitPaths,
} from './history.js';
import type { Binding } from './binding.js';

describe('managedPathsMissingFromCommit', () => {
  it('returns managed paths absent from the commit tree', () => {
    const missing = managedPathsMissingFromCommit(
      ['.cursor/rules/a.mdc', '.cursor/rules/b.mdc', 'unrelated.md'],
      ['.cursor/rules/a.mdc'],
    );
    assert.deepEqual(missing, ['.cursor/rules/b.mdc', 'unrelated.md']);
  });

  it('returns empty when all managed paths are in the commit', () => {
    assert.deepEqual(
      managedPathsMissingFromCommit(['a.md', 'b.md'], ['a.md', 'b.md', 'c.md']),
      [],
    );
  });

  it('never invents unmanaged paths from the commit tree', () => {
    const missing = managedPathsMissingFromCommit(
      ['.cursor/rules/a.mdc'],
      ['.cursor/rules/a.mdc', 'README.md'],
    );
    assert.deepEqual(missing, []);
  });
});

describe('pruneBindingToCommitPaths', () => {
  it('drops installed paths and artifacts missing from the commit', () => {
    const binding: Binding = {
      remote: 'r',
      branch: 'main',
      projects: [{ name: 'p', mode: 'linked' }],
      tools: ['cursor', 'claude-code'],
      lastSyncedCommit: 'abc',
      lastSyncedHistoryCommit: 'def',
      artifacts: [
        {
          sourcePath: 'rules/keep.md',
          project: 'p',
          type: 'rule',
          optional: false,
          localEdit: false,
          installedPaths: {
            cursor: ['.cursor/rules/keep.mdc'],
            'claude-code': ['CLAUDE.md'],
          },
        },
        {
          sourcePath: 'rules/gone.md',
          project: 'p',
          type: 'rule',
          optional: false,
          localEdit: false,
          installedPaths: {
            cursor: ['.cursor/rules/gone.mdc'],
          },
        },
      ],
    };
    const pruned = pruneBindingToCommitPaths(binding, [
      '.cursor/rules/keep.mdc',
      'CLAUDE.md',
    ]);
    assert.equal(pruned.artifacts.length, 1);
    assert.equal(pruned.artifacts[0]!.sourcePath, 'rules/keep.md');
    assert.deepEqual(pruned.artifacts[0]!.installedPaths.cursor, ['.cursor/rules/keep.mdc']);
  });
});
