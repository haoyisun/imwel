import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';
import {
  addPendingProposal,
  buildProposal,
  contributionSourceIdentity,
  graduateProjectContributions,
  markSuccessfulPushes,
  readPendingProposals,
} from './propose.js';

describe('contribution tracking persistence', () => {
  it('atomically migrates a legacy pending proposal to version 2', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-proposal-migrate-'));
    try {
      const filePath = path.join(projectDir, '.imwel', 'pending-proposals.yaml');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(
        filePath,
        YAML.stringify({
          proposals: [
            {
              localPath: '.cursor/rules/new.mdc',
              remote: 'org',
              project: 'app',
              type: 'rule',
              optional: false,
              tool: 'cursor',
            },
          ],
        }),
      );

      const [proposal] = await readPendingProposals(projectDir);
      const migrated = YAML.parse(await fs.readFile(filePath, 'utf8'));

      assert.deepEqual(proposal?.sourceFiles, ['.cursor/rules/new.mdc']);
      assert.equal(proposal?.targetRole, 'project');
      assert.equal(proposal?.canonicalPath, '.cursor/rules/new.mdc');
      assert.equal(migrated.version, 2);
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });

  it('rejects malformed records without silently discarding them', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-proposal-invalid-'));
    try {
      const filePath = path.join(projectDir, '.imwel', 'pending-proposals.yaml');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, 'proposals:\n  - remote: org\n', 'utf8');
      await assert.rejects(readPendingProposals(projectDir), /Invalid contribution tracking record/);
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });

  it('enforces one target per local source', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-proposal-owner-'));
    try {
      const first = buildProposal(
        ['.cursor/rules/new.mdc'],
        'org',
        'app',
        'project',
        'rule',
        'rules/new.md',
        false,
        'cursor',
      );
      await addPendingProposal(projectDir, first);
      await assert.rejects(
        addPendingProposal(projectDir, { ...first, project: 'other' }),
        /already tracked/,
      );
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });

  it('uses sourceId to distinguish logical artifacts sharing one native file', () => {
    const first = buildProposal(
      'AGENTS.md',
      'org',
      'app',
      'project',
      'rule',
      'rules/first.md',
      false,
      'codex',
      'first',
    );
    const second = { ...first, sourceId: 'second', canonicalPath: 'rules/second.md' };
    assert.notEqual(contributionSourceIdentity(first), contributionSourceIdentity(second));
  });

  it('records a successful push only on selected tracking records', () => {
    const first = buildProposal(
      '.cursor/rules/first.mdc',
      'org',
      'app',
      'project',
      'rule',
      'rules/first.md',
      false,
      'cursor',
    );
    const second = buildProposal(
      '.cursor/rules/second.mdc',
      'org',
      'app',
      'project',
      'rule',
      'rules/second.md',
      false,
      'cursor',
    );
    const updated = markSuccessfulPushes(
      [first, second],
      new Set([contributionSourceIdentity(first)]),
      { branch: 'imwel-push-1', commit: 'abc123' },
    );
    assert.deepEqual(updated[0]?.pushed, { branch: 'imwel-push-1', commit: 'abc123' });
    assert.equal(updated[1]?.pushed, undefined);
  });
});

describe('contribution graduation', () => {
  it('graduates matching project tracking and preserves module tracking', () => {
    const project = buildProposal(
      '.cursor/rules/app.mdc',
      'org',
      'app',
      'project',
      'rule',
      'rules/app.md',
      false,
      'cursor',
    );
    const module = buildProposal(
      '.cursor/rules/shared.mdc',
      'org',
      'shared',
      'shared',
      'rule',
      'rules/shared.md',
      false,
      'cursor',
    );

    const remaining = graduateProjectContributions([project, module], 'org', [
      { project: 'app', type: 'rule', sourcePath: 'rules/app.md' },
      { project: 'shared', type: 'rule', sourcePath: 'rules/shared.md' },
    ]);

    assert.deepEqual(remaining, [module]);
  });
});
