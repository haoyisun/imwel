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
    role: project
    optional:
      - skills/example-skill
`,
  );
  await writeFile(path.join(dir, 'README.md'), '# Template\n');
  await writeFile(
    path.join(dir, 'example-project', 'rules', 'example-rule.md'),
    `---
description: Use when editing example-project files to follow the template conventions.
---

# Rule

Body content.
`,
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

  it('warns when a rule has no frontmatter description', async () => {
    const dir = path.join(root, 'rule-no-desc');
    await scaffoldCleanTemplate(dir);
    await writeFile(
      path.join(dir, 'example-project', 'rules', 'example-rule.md'),
      '# Rule\n\nBody without any frontmatter description.\n',
    );
    const result = await lintTemplateRepo(dir);
    assert.ok(result.issues.some((i) => i.code === 'rule.descriptionMissing'));
    assert.equal(result.issues.filter((i) => i.severity === 'error').length, 0);
    assert.equal(lintExitCode(result, false), 0);
    assert.equal(lintExitCode(result, true), 1);
  });

  it('warns when a rule description is not triggerable', async () => {
    const dir = path.join(root, 'rule-bland-desc');
    await scaffoldCleanTemplate(dir);
    await writeFile(
      path.join(dir, 'example-project', 'rules', 'example-rule.md'),
      '---\ndescription: A bland label with no trigger condition stated here.\n---\n\n# Rule\n\nBody.\n',
    );
    const result = await lintTemplateRepo(dir);
    assert.ok(result.issues.some((i) => i.code === 'rule.descriptionNotTriggerable'));
    assert.ok(!result.issues.some((i) => i.code === 'rule.descriptionMissing'));
  });

  it('does not warn on a rule with a triggerable description', async () => {
    const dir = path.join(root, 'rule-good-desc');
    await scaffoldCleanTemplate(dir);
    const result = await lintTemplateRepo(dir);
    assert.ok(!result.issues.some((i) => i.code.startsWith('rule.description')));
  });

  it('warns when a project does not declare a role', async () => {
    const dir = path.join(root, 'role-undeclared');
    await scaffoldCleanTemplate(dir);
    // Rewrite the manifest without a role to trigger the nudge.
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
    const result = await lintTemplateRepo(dir);
    assert.ok(result.issues.some((i) => i.code === 'project.roleUndeclared'));
    assert.equal(result.issues.filter((i) => i.severity === 'error').length, 0);
    assert.equal(lintExitCode(result, false), 0);
    assert.equal(lintExitCode(result, true), 1);
  });

  it('does not warn roleUndeclared when role is declared', async () => {
    const dir = path.join(root, 'role-declared');
    await scaffoldCleanTemplate(dir);
    const result = await lintTemplateRepo(dir);
    assert.ok(!result.issues.some((i) => i.code === 'project.roleUndeclared'));
  });

  it('warns when a shared module ships an agents file', async () => {
    const dir = path.join(root, 'module-agents');
    await writeFile(
      path.join(dir, '.imwel', 'manifest.yaml'),
      `conventions:
  rulesDir: rules
  skillsDir: skills
  agentsFile: agents.md
projects:
  - name: python-std
    path: modules/python
    role: shared
`,
    );
    await writeFile(path.join(dir, 'README.md'), '# x\n');
    await writeFile(
      path.join(dir, 'modules', 'python', 'rules', 'style.md'),
      '---\ndescription: Use when editing Python files to follow the style guide.\n---\n\n# Style\n\nBody.\n',
    );
    await writeFile(path.join(dir, 'modules', 'python', 'agents.md'), '# Agents\n');
    const result = await lintTemplateRepo(dir);
    assert.ok(result.issues.some((i) => i.code === 'module.agentsIgnored'));
    assert.equal(result.issues.filter((i) => i.severity === 'error').length, 0);
    assert.equal(lintExitCode(result, false), 0);
    assert.equal(lintExitCode(result, true), 1);
  });

  it('does not warn module.agentsIgnored for a writable project with agents', async () => {
    const dir = path.join(root, 'project-agents');
    await scaffoldCleanTemplate(dir);
    const result = await lintTemplateRepo(dir);
    assert.ok(!result.issues.some((i) => i.code === 'module.agentsIgnored'));
  });

  it('errors when two shared modules declare a same-named rule file with differing content', async () => {
    const dir = path.join(root, 'cross-module-rule-collision');
    await writeFile(
      path.join(dir, '.imwel', 'manifest.yaml'),
      `conventions:
  rulesDir: rules
  skillsDir: skills
  agentsFile: agents.md
projects:
  - name: python-std
    path: modules/python
    role: shared
  - name: code-std
    path: modules/code
    role: shared
`,
    );
    await writeFile(path.join(dir, 'README.md'), '# x\n');
    await writeFile(
      path.join(dir, 'modules', 'python', 'rules', 'security.md'),
      '---\ndescription: Use when editing files to follow the security guide.\n---\n\n# Security\n\nPython body.\n',
    );
    await writeFile(
      path.join(dir, 'modules', 'code', 'rules', 'security.md'),
      '---\ndescription: Use when editing files to follow the security guide.\n---\n\n# Security\n\nGo body.\n',
    );
    const result = await lintTemplateRepo(dir);
    const collision = result.issues.find((i) => i.code === 'project.artifactNameCollision');
    assert.ok(collision);
    assert.equal(collision!.severity, 'error');
    assert.match(collision!.message, /python-std/);
    assert.match(collision!.message, /code-std/);
    assert.match(collision!.message, /security/);
    assert.match(collision!.message, /python-std-security\.md/);
    assert.equal(lintExitCode(result, false), 1);
    assert.equal(lintExitCode(result, true), 1);
  });

  it('does not report when two projects declare a same-named rule file with identical content', async () => {
    const dir = path.join(root, 'cross-module-rule-same-content');
    await writeFile(
      path.join(dir, '.imwel', 'manifest.yaml'),
      `conventions:
  rulesDir: rules
  skillsDir: skills
  agentsFile: agents.md
projects:
  - name: python-std
    path: modules/python
    role: shared
  - name: code-std
    path: modules/code
    role: shared
`,
    );
    await writeFile(path.join(dir, 'README.md'), '# x\n');
    const ruleContent =
      '---\ndescription: Use when editing files to follow the security guide.\n---\n\n# Security\n\nShared baseline.\n';
    await writeFile(path.join(dir, 'modules', 'python', 'rules', 'security.md'), ruleContent);
    await writeFile(path.join(dir, 'modules', 'code', 'rules', 'security.md'), ruleContent);
    const result = await lintTemplateRepo(dir);
    assert.ok(!result.issues.some((i) => i.code === 'project.artifactNameCollision'));
    assert.equal(lintExitCode(result, false), 0);
  });

  it('errors when a writable project and a module declare a same-named skill dir with differing SKILL.md', async () => {
    const dir = path.join(root, 'cross-project-skill-collision');
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
  - name: python-std
    path: modules/python
    role: shared
`,
    );
    await writeFile(path.join(dir, 'README.md'), '# x\n');
    await writeFile(
      path.join(dir, 'example-project', 'skills', 'shared-skill', 'SKILL.md'),
      GOOD_SKILL,
    );
    await writeFile(
      path.join(dir, 'modules', 'python', 'skills', 'shared-skill', 'SKILL.md'),
      GOOD_SKILL.replace('Body.\n', 'Different body.\n'),
    );
    const result = await lintTemplateRepo(dir);
    const collision = result.issues.find((i) => i.code === 'project.artifactNameCollision');
    assert.ok(collision);
    assert.equal(collision!.severity, 'error');
    assert.match(collision!.message, /shared-skill/);
    assert.match(collision!.message, /example-project-shared-skill|python-std-shared-skill/);
    assert.equal(lintExitCode(result, false), 1);
  });

  it('does not report when a writable project and a module declare a same-named skill dir with identical SKILL.md', async () => {
    const dir = path.join(root, 'cross-project-skill-same-content');
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
  - name: python-std
    path: modules/python
    role: shared
`,
    );
    await writeFile(path.join(dir, 'README.md'), '# x\n');
    await writeFile(
      path.join(dir, 'example-project', 'skills', 'shared-skill', 'SKILL.md'),
      GOOD_SKILL,
    );
    await writeFile(
      path.join(dir, 'modules', 'python', 'skills', 'shared-skill', 'SKILL.md'),
      GOOD_SKILL,
    );
    const result = await lintTemplateRepo(dir);
    assert.ok(!result.issues.some((i) => i.code === 'project.artifactNameCollision'));
  });

  it('does not warn artifactNameCollision when no names collide', async () => {
    const dir = path.join(root, 'no-collision');
    await scaffoldCleanTemplate(dir);
    const result = await lintTemplateRepo(dir);
    assert.ok(!result.issues.some((i) => i.code === 'project.artifactNameCollision'));
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
