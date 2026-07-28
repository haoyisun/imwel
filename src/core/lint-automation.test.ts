import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  setupLintAutomation,
  shouldHintLintHookActivation,
  PRE_COMMIT_HOOK,
  GITHUB_LINT_WORKFLOW,
  GITLAB_LINT_CI,
} from './lint-automation.js';
import { runGit } from './git.js';
import { pathExists } from './fs-utils.js';

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe('setupLintAutomation', () => {
  let dir: string;

  before(async () => {
    dir = await makeTempDir('imwel-lintauto-');
  });
  after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('writes the pre-commit hook and a GitHub workflow when hostCli is gh', async () => {
    const result = await setupLintAutomation(dir, {
      hostCli: 'gh',
      activateLocally: false,
    });
    assert.equal(result.hookWritten, true);
    assert.equal(result.hookSkippedExisting, false);
    assert.equal(result.ciFile, '.github/workflows/imwel-lint.yml');
    assert.equal(result.activatedLocally, false);

    const hook = await fs.readFile(path.join(dir, '.githooks', 'pre-commit'), 'utf8');
    assert.equal(hook, PRE_COMMIT_HOOK);
    const wf = await fs.readFile(path.join(dir, '.github', 'workflows', 'imwel-lint.yml'), 'utf8');
    assert.equal(wf, GITHUB_LINT_WORKFLOW);
  });

  it('does not overwrite an existing pre-commit hook', async () => {
    const result = await setupLintAutomation(dir, { hostCli: null, activateLocally: false });
    assert.equal(result.hookSkippedExisting, true);
    assert.equal(result.hookWritten, false);
  });

  it('writes a GitLab CI file when hostCli is glab and no CI file exists yet', async () => {
    const glabDir = await makeTempDir('imwel-lintauto-glab-');
    try {
      const result = await setupLintAutomation(glabDir, { hostCli: 'glab', activateLocally: false });
      assert.equal(result.ciFile, '.gitlab-ci.yml');
      const ci = await fs.readFile(path.join(glabDir, '.gitlab-ci.yml'), 'utf8');
      assert.equal(ci, GITLAB_LINT_CI);
    } finally {
      await fs.rm(glabDir, { recursive: true, force: true });
    }
  });

  it('skips CI when hostCli is null', async () => {
    const nullDir = await makeTempDir('imwel-lintauto-null-');
    try {
      const result = await setupLintAutomation(nullDir, { hostCli: null, activateLocally: false });
      assert.equal(result.ciFile, null);
      assert.ok(!(await pathExists(path.join(nullDir, '.github', 'workflows', 'imwel-lint.yml'))));
      assert.ok(!(await pathExists(path.join(nullDir, '.gitlab-ci.yml'))));
    } finally {
      await fs.rm(nullDir, { recursive: true, force: true });
    }
  });

  it('activates core.hooksPath locally when .git exists and activateLocally is true', async () => {
    const gitDir = await makeTempDir('imwel-lintauto-git-');
    try {
      await runGit(['init'], { cwd: gitDir });
      const result = await setupLintAutomation(gitDir, { hostCli: null, activateLocally: true });
      assert.equal(result.activatedLocally, true);
      const { stdout } = await runGit(['config', 'core.hooksPath'], { cwd: gitDir });
      assert.equal(stdout.trim(), '.githooks');
    } finally {
      await fs.rm(gitDir, { recursive: true, force: true });
    }
  });

  it('does not activate locally when .git is absent even if activateLocally is true', async () => {
    const noGitDir = await makeTempDir('imwel-lintauto-nogit-');
    try {
      const result = await setupLintAutomation(noGitDir, { hostCli: null, activateLocally: true });
      assert.equal(result.activatedLocally, false);
    } finally {
      await fs.rm(noGitDir, { recursive: true, force: true });
    }
  });

  it('appends the activation note to CONTRIBUTING.md once', async () => {
    const cDir = await makeTempDir('imwel-lintauto-contrib-');
    try {
      const contributing = path.join(cDir, 'CONTRIBUTING.md');
      await fs.writeFile(contributing, '# Contributing\n\nBody.\n', 'utf8');
      const note = '## Commit-time lint\n\nActivate: git config core.hooksPath .githooks';
      const r1 = await setupLintAutomation(cDir, {
        hostCli: null,
        activateLocally: false,
        contributingPath: contributing,
        activationNote: note,
      });
      assert.equal(r1.contributingUpdated, true);
      const r2 = await setupLintAutomation(cDir, {
        hostCli: null,
        activateLocally: false,
        contributingPath: contributing,
        activationNote: note,
      });
      assert.equal(r2.contributingUpdated, false);
      const content = await fs.readFile(contributing, 'utf8');
      assert.match(content, /core\.hooksPath \.githooks/);
      const occurrences = (content.match(/core\.hooksPath \.githooks/g) ?? []).length;
      assert.equal(occurrences, 1);
    } finally {
      await fs.rm(cDir, { recursive: true, force: true });
    }
  });
});

describe('shouldHintLintHookActivation', () => {
  it('returns false when .githooks is absent', async () => {
    const d = await makeTempDir('imwel-hint-none-');
    try {
      assert.equal(await shouldHintLintHookActivation(d), false);
    } finally {
      await fs.rm(d, { recursive: true, force: true });
    }
  });

  it('returns true when .githooks exists but core.hooksPath is unset', async () => {
    const d = await makeTempDir('imwel-hint-unset-');
    try {
      await runGit(['init'], { cwd: d });
      await fs.mkdir(path.join(d, '.githooks'), { recursive: true });
      assert.equal(await shouldHintLintHookActivation(d), true);
    } finally {
      await fs.rm(d, { recursive: true, force: true });
    }
  });

  it('returns false when .githooks exists and core.hooksPath is .githooks', async () => {
    const d = await makeTempDir('imwel-hint-set-');
    try {
      await runGit(['init'], { cwd: d });
      await fs.mkdir(path.join(d, '.githooks'), { recursive: true });
      await runGit(['config', 'core.hooksPath', '.githooks'], { cwd: d });
      assert.equal(await shouldHintLintHookActivation(d), false);
    } finally {
      await fs.rm(d, { recursive: true, force: true });
    }
  });
});
