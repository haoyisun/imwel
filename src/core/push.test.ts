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
  FromToolUnavailableError,
  matchesPushedCommit,
  mergeMultiToolParseResults,
  normalizeComparableContent,
  prepareSkillCacheRoot,
  resolveAuthoringTools,
  type CollectEditDependencies,
} from './push.js';
import type { Binding } from './binding.js';
import { commitInstalledFiles } from './history.js';
import {
  graduateProjectContributions,
  readPendingProposals,
  refreshProposalBaselinesAfterSync,
  writePendingProposals,
  type PendingProposal,
  buildProposal,
} from './propose.js';
import { runGit } from './git.js';
import type { Manifest } from './manifest.js';

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
        type: 'rule' as const,
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

  it('compares skills via SKILL.md under the canonical directory', async () => {
    const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-pushed-skill-'));
    try {
      await runGit(['init'], { cwd: cacheDir });
      await runGit(['config', 'user.email', 'test@example.com'], { cwd: cacheDir });
      await runGit(['config', 'user.name', 'Test'], { cwd: cacheDir });
      const skillMd = path.join(cacheDir, 'app/skills/demo/SKILL.md');
      await fs.mkdir(path.dirname(skillMd), { recursive: true });
      await fs.writeFile(skillMd, '# Demo\n', 'utf8');
      await runGit(['add', '.'], { cwd: cacheDir });
      await runGit(['commit', '-m', 'skill'], { cwd: cacheDir });
      const commit = (await runGit(['rev-parse', 'HEAD'], { cwd: cacheDir })).stdout.trim();
      const proposal = {
        canonicalPath: 'skills/demo',
        type: 'skill' as const,
        pushed: { branch: 'imwel-push-skill', commit },
      };

      assert.equal(
        await matchesPushedCommit(cacheDir, 'app', proposal, '# Demo\n'),
        true,
      );
      assert.equal(
        await matchesPushedCommit(cacheDir, 'app', proposal, '# Changed\n'),
        false,
      );
    } finally {
      await fs.rm(cacheDir, { recursive: true, force: true });
    }
  });
});

describe('prepareSkillCacheRoot', () => {
  it('replaces a file at the skill root with a directory', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-skill-root-'));
    const skillRoot = path.join(root, 'skills', 'demo');
    await fs.mkdir(path.dirname(skillRoot), { recursive: true });
    await fs.writeFile(skillRoot, 'was a file\n', 'utf8');
    await prepareSkillCacheRoot(skillRoot);
    const stat = await fs.lstat(skillRoot);
    assert.equal(stat.isDirectory(), true);
    await fs.writeFile(path.join(skillRoot, 'SKILL.md'), '# ok\n', 'utf8');
    assert.equal(await fs.readFile(path.join(skillRoot, 'SKILL.md'), 'utf8'), '# ok\n');
    await fs.rm(root, { recursive: true, force: true });
  });
});

describe('contribution baseline refresh', () => {
  it('advances retained proposal baselines after sync', () => {
    const kept = buildProposal(
      '.cursor/rules/shared.mdc',
      'org',
      'shared',
      'shared',
      'rule',
      'rules/shared.md',
      false,
      'cursor',
    );
    kept.baseBranch = 'main';
    kept.baseCommit = 'old';
    const refreshed = refreshProposalBaselinesAfterSync([kept], 'org', {
      baseBranch: 'main',
      baseCommit: 'newtip',
    });
    assert.equal(refreshed[0]?.baseCommit, 'newtip');
  });

  it('graduates skill directory paths even when recorded with SKILL.md suffix', () => {
    const skill = buildProposal(
      '.cursor/skills/demo/SKILL.md',
      'org',
      'app',
      'project',
      'skill',
      'skills/demo/SKILL.md',
      false,
      'cursor',
    );
    const remaining = graduateProjectContributions([skill], 'org', [
      { project: 'app', type: 'skill', sourcePath: 'skills/demo' },
    ]);
    assert.deepEqual(remaining, []);
  });
});

describe('mergeMultiToolParseResults bundle files', () => {
  it('dedupes equivalent bundle files across tools', () => {
    const merged = mergeMultiToolParseResults([
      {
        tool: 'cursor',
        canonicalContent: '# Demo\n',
        bundleFiles: [
          { relativePath: 'SKILL.md', content: '# Demo\n' },
          { relativePath: 'references/foo.md', content: 'refs' },
        ],
      },
      {
        tool: 'claude-code',
        canonicalContent: '# Demo\n',
        bundleFiles: [
          { relativePath: 'SKILL.md', content: '# Demo\n' },
          { relativePath: 'references/foo.md', content: 'refs' },
        ],
      },
    ]);
    assert.equal(merged.ok, true);
    if (merged.ok) {
      assert.ok(merged.bundleFiles);
      assert.equal(merged.bundleFiles!.length, 2);
    }
  });

  it('fails when accompanying files differ across tools', () => {
    assert.throws(
      () =>
        mergeMultiToolParseResults([
          {
            tool: 'cursor',
            canonicalContent: '# Demo\n',
            bundleFiles: [{ relativePath: 'references/foo.md', content: 'a' }],
          },
          {
            tool: 'claude-code',
            canonicalContent: '# Demo\n',
            bundleFiles: [{ relativePath: 'references/foo.md', content: 'b' }],
          },
        ]),
      /Canonical content conflict for references\/foo\.md/,
    );
  });
});

describe('executePush writes skill bundle files', () => {
  it('rejects unsafe bundle relative paths before any Git side effects', async () => {
    const { assertBundlePathsSafe } = await import('./propose-validate.js');
    assert.throws(
      () => assertBundlePathsSafe([{ relativePath: '../escape.md', content: 'x' }]),
      /unsafe relative path/,
    );
    assert.throws(
      () => assertBundlePathsSafe([{ relativePath: '/abs/path.md', content: 'x' }]),
      /unsafe relative path/,
    );
    assert.throws(
      () => assertBundlePathsSafe([{ relativePath: 'C:/win.md', content: 'x' }]),
      /unsafe relative path/,
    );
    // Safe paths pass without throwing.
    assertBundlePathsSafe([
      { relativePath: 'SKILL.md', content: 'x' },
      { relativePath: 'references/foo.md', content: 'x' },
      { relativePath: 'evals/case-1.md', content: 'x' },
    ]);
  });
});

describe('resolveAuthoringTools', () => {
  it('selects only tools with dirty installed paths', () => {
    assert.deepEqual(
      resolveAuthoringTools(
        ['cursor', 'claude-code'],
        {
          cursor: ['.cursor/skills/demo/SKILL.md'],
          'claude-code': ['.claude/skills/demo/SKILL.md'],
        },
        new Set(['.cursor/skills/demo/SKILL.md']),
      ),
      ['cursor'],
    );
  });

  it('honors --from even when another tool is the only dirty one', () => {
    assert.deepEqual(
      resolveAuthoringTools(
        ['cursor', 'claude-code'],
        {
          cursor: ['.cursor/skills/demo/SKILL.md'],
          'claude-code': ['.claude/skills/demo/SKILL.md'],
        },
        new Set(['.claude/skills/demo/SKILL.md']),
        'cursor',
      ),
      ['cursor'],
    );
  });

  it('returns empty when --from tool has no installed paths', () => {
    assert.deepEqual(
      resolveAuthoringTools(
        ['cursor'],
        { cursor: ['.cursor/skills/demo/SKILL.md'] },
        new Set(['.cursor/skills/demo/SKILL.md']),
        'claude-code',
      ),
      [],
    );
  });
});

describe('mergeMultiToolParseResults normalization', () => {
  it('treats CRLF and trailing whitespace as equivalent', () => {
    const merged = mergeMultiToolParseResults([
      { tool: 'cursor', canonicalContent: 'body\r\n' },
      { tool: 'claude-code', canonicalContent: 'body\n\n' },
    ]);
    assert.equal(merged.ok, true);
    assert.equal(normalizeComparableContent('body\r\n'), 'body');
  });
});

describe('dirty-wins edit candidate collection', () => {
  const manifest: Manifest = {
    conventions: { rulesDir: 'rules', skillsDir: 'skills', agentsFile: 'agents.md' },
    projects: [{ name: 'app', path: 'app', role: 'project' }],
  };

  function mockDeps(listDirty: string[]): CollectEditDependencies {
    return {
      listDirtyPaths: async () => listDirty,
      ensureRemoteCache: async () => '/mock-cache',
      readManifest: async () => manifest,
    };
  }

  async function writeSkillPair(
    projectDir: string,
    cursorBody: string,
    claudeBody: string,
    extras?: { cursorRefs?: string; claudeRefs?: string },
  ): Promise<{
    binding: Binding;
    cursorSkill: string;
    claudeSkill: string;
    cursorRef?: string;
    claudeRef?: string;
  }> {
    const cursorSkill = '.cursor/skills/demo/SKILL.md';
    const claudeSkill = '.claude/skills/demo/SKILL.md';
    await fs.mkdir(path.join(projectDir, '.cursor/skills/demo'), { recursive: true });
    await fs.mkdir(path.join(projectDir, '.claude/skills/demo'), { recursive: true });
    await fs.writeFile(path.join(projectDir, cursorSkill), cursorBody, 'utf8');
    await fs.writeFile(path.join(projectDir, claudeSkill), claudeBody, 'utf8');
    const installedPaths: Record<string, string[]> = {
      cursor: [cursorSkill],
      'claude-code': [claudeSkill],
    };
    let cursorRef: string | undefined;
    let claudeRef: string | undefined;
    if (extras?.cursorRefs !== undefined) {
      cursorRef = '.cursor/skills/demo/references/foo.md';
      await fs.mkdir(path.join(projectDir, '.cursor/skills/demo/references'), { recursive: true });
      await fs.writeFile(path.join(projectDir, cursorRef), extras.cursorRefs, 'utf8');
      installedPaths.cursor = [cursorSkill, cursorRef];
    }
    if (extras?.claudeRefs !== undefined) {
      claudeRef = '.claude/skills/demo/references/foo.md';
      await fs.mkdir(path.join(projectDir, '.claude/skills/demo/references'), { recursive: true });
      await fs.writeFile(path.join(projectDir, claudeRef), extras.claudeRefs, 'utf8');
      installedPaths['claude-code'] = [claudeSkill, claudeRef];
    }
    const binding: Binding = {
      remote: 'mock',
      branch: 'main',
      projects: [{ name: 'app', mode: 'linked' }],
      tools: ['cursor', 'claude-code'],
      lastSyncedCommit: 'upstream',
      lastSyncedHistoryCommit: 'history',
      artifacts: [
        {
          project: 'app',
          sourcePath: 'skills/demo',
          type: 'skill',
          optional: false,
          localEdit: false,
          installedPaths,
        },
      ],
    };
    return { binding, cursorSkill, claudeSkill, cursorRef, claudeRef };
  }

  it('uses the single dirty tool when clean copies disagree', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-dirty-wins-'));
    try {
      const { binding, cursorSkill, claudeSkill } = await writeSkillPair(
        projectDir,
        '# Cursor edit\n',
        '# Old claude\n',
      );
      const claudeBefore = await fs.readFile(path.join(projectDir, claudeSkill), 'utf8');
      const result = await collectEditCandidatesWithSkipped(
        projectDir,
        binding,
        [],
        {},
        mockDeps([cursorSkill]),
      );
      assert.equal(result.candidates.length, 1);
      assert.equal(result.candidates[0]!.canonicalContent, '# Cursor edit\n');
      assert.deepEqual(result.candidates[0]!.authoringTools, ['cursor']);
      assert.equal(await fs.readFile(path.join(projectDir, claudeSkill), 'utf8'), claudeBefore);
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });

  it('fails when multiple authoring tools disagree on canonical content', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-dirty-conflict-'));
    try {
      const { binding, cursorSkill, claudeSkill } = await writeSkillPair(
        projectDir,
        '# Cursor\n',
        '# Claude\n',
      );
      await assert.rejects(
        () =>
          collectEditCandidatesWithSkipped(
            projectDir,
            binding,
            [],
            {},
            mockDeps([cursorSkill, claudeSkill]),
          ),
        (error: unknown) =>
          error instanceof Error &&
          error.name === 'CanonicalConflictError' &&
          /skills\/demo/.test(error.message),
      );
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });

  it('forces a single authoring tool with --from', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-dirty-from-'));
    try {
      const { binding, cursorSkill, claudeSkill } = await writeSkillPair(
        projectDir,
        '# Cursor\n',
        '# Claude\n',
      );
      const result = await collectEditCandidatesWithSkipped(
        projectDir,
        binding,
        [],
        { fromTool: 'cursor' },
        mockDeps([cursorSkill, claudeSkill]),
      );
      assert.equal(result.candidates.length, 1);
      assert.equal(result.candidates[0]!.canonicalContent, '# Cursor\n');
      assert.deepEqual(result.candidates[0]!.authoringTools, ['cursor']);
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });

  it('ignores stale clean-tool bundles when only cursor references are dirty', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-dirty-bundle-'));
    try {
      const { binding, cursorRef, claudeRef } = await writeSkillPair(
        projectDir,
        '# Demo\n',
        '# Demo\n',
        { cursorRefs: 'new refs\n', claudeRefs: 'old refs\n' },
      );
      const claudeRefBefore = await fs.readFile(path.join(projectDir, claudeRef!), 'utf8');
      const result = await collectEditCandidatesWithSkipped(
        projectDir,
        binding,
        [],
        {},
        mockDeps([cursorRef!]),
      );
      assert.equal(result.candidates.length, 1);
      const refs = result.candidates[0]!.bundleFiles?.find((f) => f.relativePath === 'references/foo.md');
      assert.equal(refs?.content, 'new refs\n');
      assert.deepEqual(result.candidates[0]!.authoringTools, ['cursor']);
      assert.equal(await fs.readFile(path.join(projectDir, claudeRef!), 'utf8'), claudeRefBefore);
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });

  it('throws when --from tool is not installed for the artifact', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-dirty-from-missing-'));
    try {
      const { binding, cursorSkill } = await writeSkillPair(projectDir, '# A\n', '# B\n');
      binding.tools = ['cursor', 'claude-code', 'qoder'];
      await assert.rejects(
        () =>
          collectEditCandidatesWithSkipped(
            projectDir,
            binding,
            [],
            { fromTool: 'qoder' },
            mockDeps([cursorSkill]),
          ),
        (error: unknown) => error instanceof FromToolUnavailableError,
      );
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });

  it('does not rewrite clean tool files when collecting candidates (history smoke)', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-dirty-nowrap-'));
    try {
      const { binding, cursorSkill, claudeSkill } = await writeSkillPair(
        projectDir,
        '# Same\n',
        '# Same\n',
      );
      await commitInstalledFiles(projectDir, [cursorSkill, claudeSkill], 'baseline');
      await fs.writeFile(path.join(projectDir, cursorSkill), '# Edited\n', 'utf8');
      const claudeBefore = await fs.readFile(path.join(projectDir, claudeSkill), 'utf8');
      const result = await collectEditCandidatesWithSkipped(
        projectDir,
        binding,
        [],
        {},
        mockDeps([cursorSkill]),
      );
      assert.equal(result.candidates.length, 1);
      assert.equal(await fs.readFile(path.join(projectDir, claudeSkill), 'utf8'), claudeBefore);
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });
});
