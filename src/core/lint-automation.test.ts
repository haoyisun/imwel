import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  setupLintAutomation,
  shouldHintLintHookActivation,
  activateLintHook,
  writePreparePackageJson,
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

  it('appends the activation section to README.md once', async () => {
    const rDir = await makeTempDir('imwel-lintauto-readme-');
    try {
      const readme = path.join(rDir, 'README.md');
      await fs.writeFile(readme, '# My Template\n\nBody.\n', 'utf8');
      const note = '## Commit-time lint\n\nActivate: git config core.hooksPath .githooks';
      const r1 = await setupLintAutomation(rDir, {
        hostCli: null,
        activateLocally: false,
        readmePath: readme,
        readmeActivationNote: note,
      });
      assert.equal(r1.readmeUpdated, true);
      const r2 = await setupLintAutomation(rDir, {
        hostCli: null,
        activateLocally: false,
        readmePath: readme,
        readmeActivationNote: note,
      });
      assert.equal(r2.readmeUpdated, false);
      const content = await fs.readFile(readme, 'utf8');
      assert.match(content, /core\.hooksPath \.githooks/);
      const occurrences = (content.match(/core\.hooksPath \.githooks/g) ?? []).length;
      assert.equal(occurrences, 1);
    } finally {
      await fs.rm(rDir, { recursive: true, force: true });
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

describe('activateLintHook', () => {
  it('sets core.hooksPath to .githooks when .git exists', async () => {
    const d = await makeTempDir('imwel-activate-git-');
    try {
      await runGit(['init'], { cwd: d });
      const ok = await activateLintHook(d);
      assert.equal(ok, true);
      const { stdout } = await runGit(['config', 'core.hooksPath'], { cwd: d });
      assert.equal(stdout.trim(), '.githooks');
    } finally {
      await fs.rm(d, { recursive: true, force: true });
    }
  });

  it('returns false and does not touch config when .git is absent', async () => {
    const d = await makeTempDir('imwel-activate-nogit-');
    try {
      const ok = await activateLintHook(d);
      assert.equal(ok, false);
      // No .git → git config cannot have been written; verify by absence of .git/config.
      assert.equal(await pathExists(path.join(d, '.git', 'config')), false);
    } finally {
      await fs.rm(d, { recursive: true, force: true });
    }
  });
});

describe('writePreparePackageJson', () => {
  it('writes a minimal package.json with a prepare script', async () => {
    const d = await makeTempDir('imwel-pkg-write-');
    try {
      const r = await writePreparePackageJson(d, 'my-template');
      assert.equal(r, 'written');
      const pkg = JSON.parse(await fs.readFile(path.join(d, 'package.json'), 'utf8'));
      assert.equal(pkg.name, 'my-template');
      assert.equal(pkg.private, true);
      assert.equal(pkg.scripts.prepare, 'git config core.hooksPath .githooks');
    } finally {
      await fs.rm(d, { recursive: true, force: true });
    }
  });

  it('skips and returns skippedExisting when package.json already exists', async () => {
    const d = await makeTempDir('imwel-pkg-skip-');
    try {
      await fs.writeFile(path.join(d, 'package.json'), '{"name":"existing"}\n', 'utf8');
      const r = await writePreparePackageJson(d, 'my-template');
      assert.equal(r, 'skippedExisting');
      const pkg = JSON.parse(await fs.readFile(path.join(d, 'package.json'), 'utf8'));
      assert.equal(pkg.name, 'existing');
    } finally {
      await fs.rm(d, { recursive: true, force: true });
    }
  });
});
