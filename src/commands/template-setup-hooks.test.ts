import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runTemplateSetupHooks } from './template-setup-hooks.js';
import { runGit } from '../core/git.js';
import { pathExists } from '../core/fs-utils.js';
import { PRE_COMMIT_HOOK } from '../core/lint-automation.js';

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

async function scaffoldTemplate(dir: string): Promise<void> {
  await writeFile(
    path.join(dir, '.imwel', 'manifest.yaml'),
    `conventions:
  rulesDir: rules
  skillsDir: skills
  agentsFile: agents.md
projects:
  - name: example-project
    path: example-project
    role: project
`,
  );
  await writeFile(path.join(dir, 'README.md'), '# Template\n');
  await writeFile(path.join(dir, 'CONTRIBUTING.md'), '# Contributing\n');
  await writeFile(path.join(dir, 'example-project', 'rules', 'example-rule.md'), '# Rule\n');
}

describe('runTemplateSetupHooks', () => {
  it('writes hook and docs in a template repo; -y activates when .git exists', async () => {
    const dir = await makeTempDir('imwel-setup-hooks-');
    try {
      await scaffoldTemplate(dir);
      await runGit(['init'], { cwd: dir });

      const code = await runTemplateSetupHooks({
        dir,
        yes: true,
        noCi: true,
        hostCli: null,
      });
      assert.equal(code, 0);

      const hook = await fs.readFile(path.join(dir, '.githooks', 'pre-commit'), 'utf8');
      assert.equal(hook, PRE_COMMIT_HOOK);
      const readme = await fs.readFile(path.join(dir, 'README.md'), 'utf8');
      assert.match(readme, /core\.hooksPath \.githooks/);
      const contributing = await fs.readFile(path.join(dir, 'CONTRIBUTING.md'), 'utf8');
      assert.match(contributing, /core\.hooksPath \.githooks/);

      const { stdout } = await runGit(['config', 'core.hooksPath'], { cwd: dir });
      assert.equal(stdout.trim(), '.githooks');
      assert.ok(!(await pathExists(path.join(dir, 'package.json'))));
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('does not overwrite an existing pre-commit hook', async () => {
    const dir = await makeTempDir('imwel-setup-hooks-skip-');
    try {
      await scaffoldTemplate(dir);
      await fs.mkdir(path.join(dir, '.githooks'), { recursive: true });
      await fs.writeFile(path.join(dir, '.githooks', 'pre-commit'), '#!/bin/sh\necho custom\n', 'utf8');

      const code = await runTemplateSetupHooks({
        dir,
        yes: true,
        noCi: true,
        noActivate: true,
        hostCli: null,
      });
      assert.equal(code, 0);
      const hook = await fs.readFile(path.join(dir, '.githooks', 'pre-commit'), 'utf8');
      assert.match(hook, /custom/);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('fails in a consumer directory', async () => {
    const dir = await makeTempDir('imwel-setup-hooks-consumer-');
    try {
      await writeFile(
        path.join(dir, '.imwel', 'binding.yaml'),
        'remote: origin\nproject: example-project\n',
      );
      const code = await runTemplateSetupHooks({ dir, yes: true, hostCli: null });
      assert.equal(code, 1);
      assert.ok(!(await pathExists(path.join(dir, '.githooks'))));
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('fails when neither template nor consumer', async () => {
    const dir = await makeTempDir('imwel-setup-hooks-neither-');
    try {
      const code = await runTemplateSetupHooks({ dir, yes: true, hostCli: null });
      assert.equal(code, 1);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('--no-activate skips core.hooksPath', async () => {
    const dir = await makeTempDir('imwel-setup-hooks-noact-');
    try {
      await scaffoldTemplate(dir);
      await runGit(['init'], { cwd: dir });

      const code = await runTemplateSetupHooks({
        dir,
        yes: true,
        noCi: true,
        noActivate: true,
        hostCli: null,
      });
      assert.equal(code, 0);
      assert.ok(await pathExists(path.join(dir, '.githooks', 'pre-commit')));
      const result = await runGit(['config', 'core.hooksPath'], { cwd: dir }).catch(() => null);
      // git config exits non-zero when unset; runGit may throw — accept either
      if (result) {
        assert.notEqual(result.stdout.trim(), '.githooks');
      }
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('skips activation when .git is absent', async () => {
    const dir = await makeTempDir('imwel-setup-hooks-nogit-');
    try {
      await scaffoldTemplate(dir);
      const code = await runTemplateSetupHooks({
        dir,
        yes: true,
        noCi: true,
        hostCli: null,
      });
      assert.equal(code, 0);
      assert.ok(await pathExists(path.join(dir, '.githooks', 'pre-commit')));
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('--prepare writes package.json; -y alone does not', async () => {
    const dir = await makeTempDir('imwel-setup-hooks-prep-');
    try {
      await scaffoldTemplate(dir);
      const code1 = await runTemplateSetupHooks({
        dir,
        yes: true,
        noCi: true,
        noActivate: true,
        hostCli: null,
      });
      assert.equal(code1, 0);
      assert.ok(!(await pathExists(path.join(dir, 'package.json'))));

      const code2 = await runTemplateSetupHooks({
        dir,
        yes: true,
        prepare: true,
        noCi: true,
        noActivate: true,
        hostCli: null,
      });
      assert.equal(code2, 0);
      const pkg = JSON.parse(await fs.readFile(path.join(dir, 'package.json'), 'utf8'));
      assert.equal(pkg.scripts.prepare, 'git config core.hooksPath .githooks');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('--no-ci skips CI even when hostCli would write one', async () => {
    const dir = await makeTempDir('imwel-setup-hooks-noci-');
    try {
      await scaffoldTemplate(dir);
      const code = await runTemplateSetupHooks({
        dir,
        yes: true,
        noCi: true,
        noActivate: true,
        hostCli: 'gh',
      });
      assert.equal(code, 0);
      assert.ok(!(await pathExists(path.join(dir, '.github', 'workflows', 'imwel-lint.yml'))));
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('writes GitHub CI when hostCli is gh and --no-ci is false', async () => {
    const dir = await makeTempDir('imwel-setup-hooks-ci-');
    try {
      await scaffoldTemplate(dir);
      const code = await runTemplateSetupHooks({
        dir,
        yes: true,
        noActivate: true,
        hostCli: 'gh',
      });
      assert.equal(code, 0);
      assert.ok(await pathExists(path.join(dir, '.github', 'workflows', 'imwel-lint.yml')));
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
