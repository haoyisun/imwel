import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { lintExitCode, lintTemplateRepo } from './lint-template.js';

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

const GOOD_SKILL = `---
name: example-skill
description: Use when working on example-project tasks related to the template repository conventions.
---

# Example Skill

Body.
`;

async function scaffoldCleanTemplate(dir: string): Promise<void> {
  await writeFile(
    path.join(dir, '.imwel', 'manifest.yaml'),
    `conventions:
  rulesDir: rules
  skillsDir: skills
  agentsFile: agents.md
projects:
  - name: example-project
    path: example-project
    optional:
      - skills/example-skill
`,
  );
  await writeFile(path.join(dir, 'README.md'), '# Template\n');
  await writeFile(
    path.join(dir, 'example-project', 'rules', 'example-rule.md'),
    '# Rule\n',
  );
  await writeFile(
    path.join(dir, 'example-project', 'skills', 'example-skill', 'SKILL.md'),
    GOOD_SKILL,
  );
  await writeFile(path.join(dir, 'example-project', 'agents.md'), '# Agents\n');
}

describe('lintTemplateRepo', () => {
  let root: string;

  before(async () => {
    root = await makeTempDir('imwel-lint-');
  });

  after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('reports wrong context for neither', async () => {
    const dir = path.join(root, 'neither');
    await fs.mkdir(dir, { recursive: true });
    const result = await lintTemplateRepo(dir);
    assert.equal(result.wrongContext, true);
    assert.equal(result.contextKind, 'neither');
    assert.equal(lintExitCode(result, false), 1);
  });

  it('reports wrong context for consumer without full template lint', async () => {
    const dir = path.join(root, 'consumer');
    await writeFile(path.join(dir, '.imwel', 'binding.yaml'), 'remote: org\n');
    const result = await lintTemplateRepo(dir);
    assert.equal(result.wrongContext, true);
    assert.equal(result.contextKind, 'consumer');
    assert.equal(result.issues.length, 0);
    assert.equal(lintExitCode(result, false), 1);
  });

  it('passes a clean template with exit 0', async () => {
    const dir = path.join(root, 'clean');
    await scaffoldCleanTemplate(dir);
    const result = await lintTemplateRepo(dir);
    assert.equal(result.wrongContext, false);
    assert.equal(result.issues.filter((i) => i.severity === 'error').length, 0);
    assert.equal(lintExitCode(result, false), 0);
  });

  it('errors when a skill directory is missing SKILL.md', async () => {
    const dir = path.join(root, 'missing-skill-md');
    await scaffoldCleanTemplate(dir);
    await fs.mkdir(path.join(dir, 'example-project', 'skills', 'broken'), {
      recursive: true,
    });
    const result = await lintTemplateRepo(dir);
    assert.ok(result.issues.some((i) => i.code === 'skill.missingSkillMd'));
    assert.equal(lintExitCode(result, false), 1);
  });

  it('errors when project path is missing', async () => {
    const dir = path.join(root, 'missing-project');
    await writeFile(
      path.join(dir, '.imwel', 'manifest.yaml'),
      'projects:\n  - name: gone\n    path: does-not-exist\n',
    );
    await writeFile(path.join(dir, 'README.md'), '# x\n');
    const result = await lintTemplateRepo(dir);
    assert.ok(result.issues.some((i) => i.code === 'project.pathMissing'));
    assert.equal(lintExitCode(result, false), 1);
  });

  it('warns on non-triggerable description but exits 0 by default', async () => {
    const dir = path.join(root, 'warn-desc');
    await scaffoldCleanTemplate(dir);
    await writeFile(
      path.join(dir, 'example-project', 'skills', 'example-skill', 'SKILL.md'),
      `---
name: example-skill
description: A short bland label that never says the trigger condition at all.
---

# Example
`,
    );
    const result = await lintTemplateRepo(dir);
    assert.ok(result.issues.some((i) => i.severity === 'warning'));
    assert.equal(result.issues.filter((i) => i.severity === 'error').length, 0);
    assert.equal(lintExitCode(result, false), 0);
    assert.equal(lintExitCode(result, true), 1);
  });

  it('errors on path escape in project path', async () => {
    const dir = path.join(root, 'escape');
    await writeFile(
      path.join(dir, '.imwel', 'manifest.yaml'),
      'projects:\n  - name: bad\n    path: ../outside\n',
    );
    await writeFile(path.join(dir, 'README.md'), '# x\n');
    const result = await lintTemplateRepo(dir);
    assert.ok(result.issues.some((i) => i.code === 'project.pathEscape'));
    assert.equal(lintExitCode(result, false), 1);
  });
});
