import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBinding, projectMode, writableProjectName, type Binding } from './binding.js';

describe('normalizeBinding', () => {
  it('upgrades a legacy single-project binding into projects[]', () => {
    const legacy = {
      remote: 'r',
      branch: 'main',
      project: 'java',
      tools: ['cursor'],
      lastSyncedCommit: 'abc',
      lastSyncedHistoryCommit: 'def',
      artifacts: [
        {
          sourcePath: 'rules/a.md',
          type: 'rule' as const,
          optional: false,
          localEdit: false,
          installedPaths: { cursor: ['.cursor/rules/a.mdc'] },
        },
      ],
    };
    const b = normalizeBinding(legacy);
    assert.deepEqual(b.projects, [{ name: 'java', mode: 'linked' }]);
    // Legacy artifacts are attributed to the sole/writable project.
    assert.equal(b.artifacts[0]!.project, 'java');
  });

  it('preserves an explicit projects[] with modes and frozen flags', () => {
    const raw = {
      remote: 'r',
      branch: 'main',
      projects: [
        { name: 'app', mode: 'linked' as const },
        { name: 'python-std', mode: 'subscribed' as const, frozen: true },
      ],
      tools: ['cursor'],
      lastSyncedCommit: 'abc',
      lastSyncedHistoryCommit: 'def',
      artifacts: [],
    };
    const b = normalizeBinding(raw);
    assert.deepEqual(b.projects, [
      { name: 'app', mode: 'linked' },
      { name: 'python-std', mode: 'subscribed', frozen: true },
    ]);
  });

  it('defaults artifacts missing a project to the writable project', () => {
    const raw = {
      remote: 'r',
      branch: 'main',
      projects: [
        { name: 'shared', mode: 'subscribed' as const },
        { name: 'app', mode: 'linked' as const },
      ],
      tools: ['cursor'],
      lastSyncedCommit: 'abc',
      lastSyncedHistoryCommit: 'def',
      artifacts: [
        {
          sourcePath: 'rules/a.md',
          type: 'rule' as const,
          optional: false,
          localEdit: false,
          installedPaths: {},
        },
      ],
    };
    const b = normalizeBinding(raw);
    assert.equal(b.artifacts[0]!.project, 'app');
  });
});

describe('binding helpers', () => {
  const binding: Binding = {
    remote: 'r',
    branch: 'main',
    projects: [
      { name: 'app', mode: 'linked' },
      { name: 'python-std', mode: 'subscribed' },
    ],
    tools: ['cursor'],
    lastSyncedCommit: 'abc',
    lastSyncedHistoryCommit: 'def',
    artifacts: [],
  };

  it('writableProjectName returns the single linked project', () => {
    assert.equal(writableProjectName(binding), 'app');
  });

  it('projectMode looks up mode by name', () => {
    assert.equal(projectMode(binding, 'python-std'), 'subscribed');
    assert.equal(projectMode(binding, 'missing'), undefined);
  });
});
