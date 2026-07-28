import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { BindingInspectionView } from '../core/binding-inspection.js';
import { setActiveLocale } from '../locales/index.js';
import { formatBindingInspection, runBindingShow } from './binding.js';

const view: BindingInspectionView = {
  schemaVersion: 1,
  binding: {
    remoteAlias: 'team',
    branch: 'main',
    linkedProject: 'app',
    modules: [{ name: 'shared', frozen: true }],
    tools: ['cursor'],
    sync: { remoteCommit: 'abc', historyCommit: 'def' },
    managedArtifactCount: 1,
    managedArtifacts: [
      {
        project: 'shared',
        role: 'subscribed',
        type: 'rule',
        requirement: 'required',
        canonicalPath: 'rules/shared.md',
        installedPaths: [
          { tool: 'cursor', path: '.cursor/rules/shared.mdc', status: 'missing' },
        ],
      },
    ],
  },
  contributionTracking: {
    count: 1,
    records: [
      {
        target: { remoteAlias: 'team', project: 'shared' },
        role: 'shared',
        status: 'pushed',
        type: 'rule',
        requirement: 'required',
        canonicalPath: 'rules/shared.md',
        tool: 'cursor',
        sourceFiles: [
          { path: '.cursor/rules/shared.mdc', status: 'missing' },
        ],
        latestPush: { branch: 'imwel-push-1', commit: '1234567' },
      },
    ],
  },
};

describe('binding inspection formatting', () => {
  it('keeps the default summary compact and separates both responsibilities', () => {
    setActiveLocale('en');
    assert.equal(
      formatBindingInspection(view),
      [
        'Binding',
        '  Remote: team / main',
        '  Linked project: app',
        '  Subscribed modules: shared (frozen)',
        '  Tools: cursor',
        '  Last synced remote commit: abc',
        '  Last synced history commit: def',
        '  Managed artifacts: 1',
        '',
        'Contribution tracking',
        '  These records authorize contributions; they are not installed binding state.',
        '  Tracked contributions: 1',
      ].join('\n'),
    );
  });

  it('shows ownership, path status, Git refs, and actionable missing hints', () => {
    setActiveLocale('en');
    const output = formatBindingInspection(view, true);
    assert.match(output, /subscribed project "shared"/);
    assert.match(output, /\.cursor\/rules\/shared\.mdc \[missing\]/);
    assert.match(output, /Latest push: imwel-push-1 @ 1234567/);
    assert.match(output, /imwel sync/);
    assert.match(output, /imwel propose/);
    assert.equal(output.match(/  - rules\/shared\.md/g)?.length, 2);
  });

  it('prints valid JSON only and leaves an empty directory untouched', async () => {
    setActiveLocale('en');
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-binding-json-'));
    const messages: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => messages.push(args.join(' '));
    try {
      assert.equal(await runBindingShow({ json: true }, projectDir), 0);
      assert.deepEqual(JSON.parse(messages.join('\n')), {
        schemaVersion: 1,
        binding: null,
        contributionTracking: null,
      });
      assert.deepEqual(await fs.readdir(projectDir), []);
    } finally {
      console.log = originalLog;
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });
});
