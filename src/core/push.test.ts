import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  shouldUseDirectPush,
  buildCompareUrl,
  collectEditCandidatesWithSkipped,
  collectProposalCandidatesWithSkipped,
  matchesPushedCommit,
  mergeMultiToolParseResults,
} from './push.js';
import type { Binding } from './binding.js';
import { readPendingProposals, writePendingProposals, type PendingProposal } from './propose.js';
import { runGit } from './git.js';

describe('push directPush flag', () => {
  it('defaults to branch workflow when directPush is unset', () => {
    assert.equal(shouldUseDirectPush(undefined), false);
    assert.equal(shouldUseDirectPush(false), false);
  });

  it('allows direct push only when explicitly enabled', () => {
    assert.equal(shouldUseDirectPush(true), true);
  });

  it('builds github compare URL', () => {
    const url = buildCompareUrl('git@github.com:acme/templates.git', 'main', 'imwel-push-abc');
    assert.ok(url.includes('github.com/acme/templates/compare/main...imwel-push-abc'));
  });
});

describe('mergeMultiToolParseResults', () => {
  it('merges targetOverrides when canonical content matches', () => {
    const merged = mergeMultiToolParseResults([
      { tool: 'cursor', canonicalContent: 'body', targetOverrides: { alwaysApply: true } },
      { tool: 'claude-code', canonicalContent: 'body', targetOverrides: { import: true } },
    ]);
    assert.equal(merged.ok, true);
    if (merged.ok) {
      assert.equal(merged.canonicalContent, 'body');
      assert.deepEqual(merged.targetOverrides, {
        cursor: { alwaysApply: true },
        'claude-code': { import: true },
      });
    }
  });

  it('reports conflict when canonical content differs', () => {
    const merged = mergeMultiToolParseResults([
      { tool: 'cursor', canonicalContent: 'a' },
      { tool: 'claude-code', canonicalContent: 'b' },
    ]);
    assert.equal(merged.ok, false);
    if (!merged.ok) {
      assert.deepEqual(merged.tools, ['cursor', 'claude-code']);
    }
  });
});

describe('push missing input preflight', () => {
  it('skips a missing binding file before remote or Git side effects', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-push-binding-missing-'));
    try {
      const binding: Binding = {
        remote: 'does-not-exist',
        branch: 'main',
        projects: [{ name: 'app', mode: 'linked' }],
        tools: ['cursor'],
        lastSyncedCommit: 'upstream',
        lastSyncedHistoryCommit: 'history',
        artifacts: [
          {
            project: 'app',
            sourcePath: 'rules/app.md',
            type: 'rule',
            optional: false,
            localEdit: false,
            installedPaths: { cursor: ['.cursor/rules/app.mdc'] },
          },
        ],
      };

      const result = await collectEditCandidatesWithSkipped(projectDir, binding);

      assert.deepEqual(result.candidates, []);
      assert.deepEqual(result.skipped, [
        {
          sourcePath: 'rules/app.md',
          kind: 'binding',
          missingPaths: ['.cursor/rules/app.mdc'],
        },
      ]);
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });

  it('skips a missing proposal source without ENOENT and retains its tracking', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-push-proposal-missing-'));
    try {
      const proposal: PendingProposal = {
        localPath: '.cursor/rules/new.mdc',
        sourceFiles: ['.cursor/rules/new.mdc'],
        sourceId: 'new',
        remote: 'does-not-exist',
        project: 'app',
        targetRole: 'project',
        type: 'rule',
        canonicalPath: 'rules/new.md',
        optional: false,
        tool: 'cursor',
      };

      const result = await collectProposalCandidatesWithSkipped(projectDir, [proposal]);
      await writePendingProposals(projectDir, [proposal]);

      assert.deepEqual(result.candidates, []);
      assert.deepEqual(result.skipped, [
        {
          sourcePath: proposal.localPath,
          kind: 'proposal',
          missingPaths: [proposal.localPath],
          trackingIdentity: 'cursor\u0000.cursor/rules/new.mdc\u0000new',
        },
      ]);
      assert.deepEqual(await readPendingProposals(projectDir), [proposal]);
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });
});

describe('pushed Git revision comparison', () => {
  it('skips unchanged canonical content and detects later edits without a custom hash', async () => {
    const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-pushed-sha-'));
    try {
      await runGit(['init'], { cwd: cacheDir });
      await runGit(['config', 'user.email', 'test@example.com'], { cwd: cacheDir });
      await runGit(['config', 'user.name', 'Test'], { cwd: cacheDir });
      const canonicalPath = path.join(cacheDir, 'projects/app/rules/new.md');
      await fs.mkdir(path.dirname(canonicalPath), { recursive: true });
      await fs.writeFile(canonicalPath, 'same content\n', 'utf8');
      await runGit(['add', '.'], { cwd: cacheDir });
      await runGit(['commit', '-m', 'baseline'], { cwd: cacheDir });
      const commit = (await runGit(['rev-parse', 'HEAD'], { cwd: cacheDir })).stdout.trim();
      const proposal = {
        canonicalPath: 'rules/new.md',
        pushed: { branch: 'imwel-push-test', commit },
      };

      assert.equal(
        await matchesPushedCommit(cacheDir, 'projects/app', proposal, 'same content\n'),
        true,
      );
      assert.equal(
        await matchesPushedCommit(cacheDir, 'projects/app', proposal, 'changed content\n'),
        false,
      );
    } finally {
      await fs.rm(cacheDir, { recursive: true, force: true });
    }
  });
});
