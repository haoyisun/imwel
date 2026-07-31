import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { generateTemplateFromProject } from './template-from-project.js';
import { pathExists } from './fs-utils.js';

async function writeRule(dir: string, slug: string, body: string): Promise<void> {
  const abs = path.join(dir, '.cursor', 'rules', `${slug}.mdc`);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, `---\ndescription: ${slug}\n---\n${body}\n`, 'utf8');
}

async function writeSkillBundle(
  dir: string,
  slug: string,
  skillBody: string,
  extras: Record<string, string>,
): Promise<void> {
  const skillDir = path.join(dir, '.cursor', 'skills', slug);
  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillBody, 'utf8');
  for (const [rel, body] of Object.entries(extras)) {
    const abs = path.join(skillDir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, body, 'utf8');
  }
}

describe('generateTemplateFromProject', () => {
  let projectDir: string;

  before(async () => {
    projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-fromproj-'));
    await writeRule(projectDir, 'graphql-conventions', 'Always paginate list queries.');
    await writeRule(projectDir, 'imwel-extract', 'imwel installed rule body.');
    await writeRule(projectDir, 'openspec-apply', 'openspec installed rule body.');
    await writeSkillBundle(projectDir, 'layered-skill', '---\nname: layered-skill\n---\nMain body.\n', {
      'references/foo.md': 'foo reference',
      'evals/case-1.md': 'case 1 eval',
    });
  });

  after(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
  });

  it('harvests only USER artifacts and excludes MINE/FOREIGN', async () => {
    const result = await generateTemplateFromProject(projectDir, {
      topic: 'test',
      now: new Date('2026-07-24T00:00:00Z'),
    });

    assert.ok(await pathExists(path.join(result.genDir, '.imwel', 'manifest.yaml')));
    assert.ok(
      await pathExists(path.join(result.genDir, 'harvested', 'rules', 'graphql-conventions.md')),
    );
    assert.ok(!(await pathExists(path.join(result.genDir, 'harvested', 'rules', 'imwel-extract.md'))));
    assert.ok(!(await pathExists(path.join(result.genDir, 'harvested', 'rules', 'openspec-apply.md'))));

    const slugs = result.artifacts.map((a) => a.slug).sort();
    assert.deepEqual(slugs, ['graphql-conventions', 'layered-skill']);
    assert.equal(result.excluded.length, 2);
  });

  it('scaffolds family-A author commands into the generated dir', async () => {
    const result = await generateTemplateFromProject(projectDir, {
      topic: 'commands',
      now: new Date('2026-07-24T00:00:00Z'),
    });
    assert.ok(await pathExists(path.join(result.genDir, '.cursor', 'commands', 'imwel-author.md')));
    assert.ok(await pathExists(path.join(result.genDir, '.cursor', 'commands', 'imwel-lint.md')));
  });

  it('preserves layered skill subdirectories when harvesting', async () => {
    const result = await generateTemplateFromProject(projectDir, {
      topic: 'layered',
      now: new Date('2026-07-24T00:00:00Z'),
    });
    const skillBase = path.join(result.genDir, 'harvested', 'skills', 'layered-skill');
    assert.ok(await pathExists(path.join(skillBase, 'SKILL.md')), 'SKILL.md should be written');
    assert.ok(
      await pathExists(path.join(skillBase, 'references', 'foo.md')),
      'references/foo.md should be preserved',
    );
    assert.ok(
      await pathExists(path.join(skillBase, 'evals', 'case-1.md')),
      'evals/case-1.md should be preserved',
    );
    const refsContent = await fs.readFile(path.join(skillBase, 'references', 'foo.md'), 'utf8');
    assert.match(refsContent, /foo reference/);
    const skill = result.artifacts.find((a) => a.type === 'skill' && a.slug === 'layered-skill');
    assert.ok(skill, 'layered-skill should be consolidated');
    assert.ok(skill!.bundleFiles && skill!.bundleFiles.length >= 3, 'bundle should include accompanying files');
  });
});
