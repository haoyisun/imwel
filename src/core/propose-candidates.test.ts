import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { adapters } from '../adapters/index.js';
import { collectProposeCandidates } from './propose-candidates.js';

async function writeRule(dir: string, slug: string): Promise<string> {
  const rel = `.cursor/rules/${slug}.mdc`;
  const abs = path.join(dir, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, `---\ndescription: ${slug}\n---\nBody for ${slug}.\n`, 'utf8');
  return rel;
}

describe('collectProposeCandidates', () => {
  let projectDir: string;

  before(async () => {
    projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-propose-'));
    await writeRule(projectDir, 'graphql-conventions');
    await writeRule(projectDir, 'imwel-extract'); // MINE (namespace)
    await writeRule(projectDir, 'openspec-apply'); // FOREIGN
    const skillPath = path.join(projectDir, '.cursor/skills/review/SKILL.md');
    await fs.mkdir(path.dirname(skillPath), { recursive: true });
    await fs.writeFile(skillPath, '# Review\n', 'utf8');
    await fs.writeFile(path.join(projectDir, 'AGENTS.md'), '# Shared instructions\n', 'utf8');
  });

  after(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
  });

  it('returns USER candidates with canonical rule, skill, and shared-file paths', async () => {
    const result = await collectProposeCandidates(
      projectDir,
      adapters,
      null,
      [],
      {
        remote: 'org',
        project: { name: 'app', path: 'projects/app' },
        conventions: { rulesDir: 'rules', skillsDir: 'skills', agentsFile: 'agents.md' },
      },
      projectDir,
    );
    const paths = result.candidates.map((candidate) => candidate.path);

    assert.ok(paths.includes('.cursor/rules/graphql-conventions.mdc'));
    assert.ok(!paths.includes('.cursor/rules/imwel-extract.mdc'));
    assert.ok(!paths.includes('.cursor/rules/openspec-apply.mdc'));
    assert.equal(
      result.candidates.find((candidate) => candidate.path.endsWith('graphql-conventions.mdc'))
        ?.canonicalPath,
      'rules/graphql-conventions.md',
    );
    assert.equal(
      result.candidates.find((candidate) => candidate.path.includes('/skills/review/'))
        ?.canonicalPath,
      'skills/review',
    );
    assert.ok(
      result.candidates.some(
        (candidate) =>
          candidate.sourceFiles.includes('AGENTS.md') &&
          candidate.canonicalPath === 'rules/agents.md',
      ),
    );
  });
});
