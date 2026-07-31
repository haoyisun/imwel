import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { BindingInspectionView } from '../core/binding-inspection.js';
import { setActiveLocale } from '../locales/index.js';
import {
  emitBindingWarnings,
  formatBindingInspection,
  runBindingShow,
} from './binding.js';

const view: BindingInspectionView = {
  schemaVersion: 1,
  binding: {
    remoteAlias: 'team',
    branch: 'main',
    linkedProject: 'app',
    modules: [
      { name: 'zeta', frozen: false },
      { name: 'shared', frozen: true },
    ],
    tools: ['claude-code', 'cursor'],
    sync: { remoteCommit: 'abc', historyCommit: 'def' },
    managedArtifactCount: 5,
    managedArtifacts: [
      {
        project: 'shared',
        role: 'subscribed',
        type: 'rule',
        requirement: 'required',
        canonicalPath: 'rules/shared.md',
        installedPaths: [
          { tool: 'cursor', path: '.cursor/rules/shared.mdc', status: 'missing' },
          { tool: 'cursor', path: '.cursor/rules/shared-copy.mdc', status: 'missing' },
        ],
      },
      {
        project: 'app',
        role: 'linked',
        type: 'skill',
        requirement: 'optional',
        canonicalPath: 'skills/release/SKILL.md',
        installedPaths: [
          { tool: 'cursor', path: '.cursor/skills/release/SKILL.md', status: 'present' },
        ],
      },
      {
        project: 'app',
        role: 'linked',
        type: 'rule',
        requirement: 'required',
        canonicalPath: 'rules/app.md',
        installedPaths: [
          { tool: 'claude-code', path: 'CLAUDE.md', status: 'present' },
          { tool: 'cursor', path: '.cursor/rules/app.mdc', status: 'present' },
        ],
      },
      {
        project: 'app',
        role: 'linked',
        type: 'agents',
        requirement: 'required',
        canonicalPath: 'agents.md',
        installedPaths: [
          { tool: 'cursor', path: 'AGENTS.md', status: 'present' },
        ],
      },
      {
        project: 'zeta',
        role: 'subscribed',
        type: 'agents',
        requirement: 'required',
        canonicalPath: 'AGENTS.md',
        installedPaths: [
          { tool: 'cursor', path: 'AGENTS.md', status: 'present' },
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
  it('renders the complete default tree in linked, module, and type order', () => {
    setActiveLocale('en');
    assert.equal(
      formatBindingInspection(view),
      [
        'Binding',
        '  Remote: team / main',
        '  Linked project: app',
        '  Subscribed modules: shared (frozen), zeta',
        '  Tools: claude-code, cursor',
        '  Last synced remote commit: abc',
        '  Last synced history commit: def',
        '  Managed artifacts: 5',
        '  app (linked)',
        '  ├─ rule',
        '  │  └─ rules/app.md (rule · required) → claude-code, cursor',
        '  ├─ skill',
        '  │  └─ skills/release/SKILL.md (skill · optional) → cursor',
        '  └─ agents',
        '     └─ agents.md (agents · required) → cursor',
        '  shared (subscribed, frozen)',
        '  └─ rule',
        '     └─ rules/shared.md (rule · required) → cursor ! missing',
        '  zeta (subscribed)',
        '  └─ agents',
        '     └─ AGENTS.md (agents · required) → cursor',
        '',
        'Contribution tracking',
        '  These records authorize contributions; they are not installed binding state.',
        '  Tracked contributions: 1',
        '  team/shared',
        '  └─ rule',
        '     └─ rules/shared.md (rule · required) → cursor · pushed (awaiting merge) · shared',
        '        ├─ Source: .cursor/rules/shared.mdc ! missing',
        '        └─ Latest push: imwel-push-1 @ 1234567',
      ].join('\n'),
    );
  });

  it('marks missing paths by default without repeating project ownership on leaves', () => {
    setActiveLocale('en');
    const output = formatBindingInspection(view);
    assert.match(output, /rules\/shared\.md \(rule · required\) → cursor ! missing/);
    assert.match(output, /Source: \.cursor\/rules\/shared\.mdc ! missing/);
    assert.match(output, /Latest push: imwel-push-1 @ 1234567/);
    assert.doesNotMatch(output.split('\n\nContribution tracking')[0] ?? '', /rules\/shared\.md.*shared/);
  });

  it('emits counted missing hints through warning output', () => {
    setActiveLocale('en');
    const messages: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => messages.push(args.map(String).join(' '));
    try {
      emitBindingWarnings(view);
      assert.deepEqual(messages, [
        '⚠ 2 installed paths missing — run `imwel sync` to restore.',
        '⚠ 1 contribution source missing — manage its tracking with `imwel propose`.',
      ]);
    } finally {
      console.log = originalLog;
    }
  });

  it('localizes tree enums in zh-CN while preserving paths and tool ids', () => {
    setActiveLocale('zh-CN');
    const output = formatBindingInspection(view);

    assert.match(output, /├─ 规则/);
    assert.match(output, /rules\/app\.md（规则 · 必选）→ claude-code, cursor/);
    assert.match(output, /skills\/release\/SKILL\.md（技能 · 可选）→ cursor/);
    assert.match(output, /cursor · 已推送（待合入） · 共享模块/);
    assert.match(output, /\.cursor\/rules\/shared\.mdc ! 缺失/);
    assert.doesNotMatch(output, /（(?:rule|skill|agents) · (?:required|optional)）/);
    assert.doesNotMatch(output, / · (?:pending|pushed) · (?:project|shared)$/m);
  });

  it('prints valid JSON only and leaves an empty directory untouched', async () => {
    setActiveLocale('en');
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-binding-json-'));
    const messages: string[] = [];
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: string | Uint8Array) => {
      messages.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      assert.equal(await runBindingShow({ json: true }, projectDir), 0);
      assert.deepEqual(JSON.parse(messages.join('')), {
        schemaVersion: 1,
        binding: null,
        contributionTracking: null,
      });
      assert.deepEqual(await fs.readdir(projectDir), []);
    } finally {
      process.stdout.write = originalWrite;
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });
});
