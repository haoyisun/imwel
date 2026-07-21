import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseRuleOverlay } from './rule-overlay.js';
import { discoverArtifacts } from './artifacts.js';
import { renderArtifacts } from './render.js';
import type { ManifestConventions, ManifestProject } from './manifest.js';

const CONVENTIONS: ManifestConventions = {
  rulesDir: 'rules',
  skillsDir: 'skills',
  agentsFile: 'agents.md',
};
const PROJECT: ManifestProject = { name: 'p', path: 'p' };

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'imwel-overlay-'));
}

async function writeFile(root: string, rel: string, content: string): Promise<void> {
  const abs = path.join(root, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, 'utf8');
}

describe('parseRuleOverlay', () => {
  it('strips frontmatter and maps semantic overrides', () => {
    const { body, overrides } = parseRuleOverlay(
      '---\ndescription: Use when editing TS.\nglobs:\n  - "**/*.ts"\n---\n\n# Body\n',
    );
    assert.equal(body.trim(), '# Body');
    assert.equal(overrides?.description, 'Use when editing TS.');
    assert.deepEqual(overrides?.globs, ['**/*.ts']);
  });

  it('returns content unchanged when there is no frontmatter', () => {
    const content = '# Just a rule\n\nNo frontmatter here.\n';
    const { body, overrides } = parseRuleOverlay(content);
    assert.equal(body, content);
    assert.equal(overrides, undefined);
  });
});

describe('discoverArtifacts overlay + skill description', () => {
  let root: string;
  beforeEach(async () => {
    root = await makeTempDir();
  });
  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('parses rule overlay into targetOverrides and strips the body', async () => {
    await writeFile(
      root,
      'p/rules/naming.md',
      '---\ndescription: Naming rules.\nalwaysApply: true\n---\n\n# Naming\n',
    );
    const artifacts = await discoverArtifacts(root, PROJECT, CONVENTIONS);
    const rule = artifacts.find((a) => a.type === 'rule');
    assert.ok(rule);
    assert.equal(rule!.canonicalContent.trim(), '# Naming');
    assert.equal((rule!.targetOverrides as Record<string, unknown>).description, 'Naming rules.');
    assert.equal((rule!.targetOverrides as Record<string, unknown>).alwaysApply, true);
  });

  it('carries a skill SKILL.md description onto the artifact', async () => {
    await writeFile(
      root,
      'p/skills/helper/SKILL.md',
      '---\nname: helper\ndescription: Use when scaffolding a component.\n---\n\n# Helper\n',
    );
    const artifacts = await discoverArtifacts(root, PROJECT, CONVENTIONS);
    const skill = artifacts.find((a) => a.type === 'skill');
    assert.ok(skill);
    assert.equal(
      (skill!.targetOverrides as Record<string, unknown>).description,
      'Use when scaffolding a component.',
    );
  });
});

describe('renderArtifacts author-default overlay', () => {
  it('uses the author description when no consumer override exists', () => {
    const { files } = renderArtifacts(
      [
        {
          sourcePath: 'rules/naming.md',
          type: 'rule',
          optional: false,
          canonicalContent: '# Naming\n',
          targetOverrides: { description: 'Use when naming things.', globs: ['**/*.ts'] },
        },
      ],
      ['cursor'],
    );
    const mdc = files.find((f) => f.path.endsWith('.mdc'));
    assert.ok(mdc);
    assert.match(mdc!.content, /description: Use when naming things\./);
    assert.match(mdc!.content, /\*\*\/\*\.ts/);
  });

  it('lets a consumer per-tool override win over the author default', () => {
    const overrides = new Map<string, Record<string, Record<string, unknown>>>([
      ['rules/naming.md', { cursor: { description: 'Consumer wins.' } }],
    ]);
    const { files } = renderArtifacts(
      [
        {
          sourcePath: 'rules/naming.md',
          type: 'rule',
          optional: false,
          canonicalContent: '# Naming\n',
          targetOverrides: { description: 'Author default.' },
        },
      ],
      ['cursor'],
      overrides,
    );
    const mdc = files.find((f) => f.path.endsWith('.mdc'));
    assert.ok(mdc);
    assert.match(mdc!.content, /description: Consumer wins\./);
  });

  it('propagates a skill description into an R2 on-demand rule (windsurf)', () => {
    const { files } = renderArtifacts(
      [
        {
          sourcePath: 'skills/helper',
          type: 'skill',
          optional: false,
          canonicalContent: '# Helper\n',
          bundleFiles: [{ relativePath: 'SKILL.md', content: '# Helper\n' }],
          targetOverrides: { description: 'Use when scaffolding a component.' },
        },
      ],
      ['windsurf'],
    );
    const rule = files.find((f) => f.path.includes('.windsurf/rules/'));
    assert.ok(rule);
    assert.match(rule!.content, /description: Use when scaffolding a component\./);
    assert.doesNotMatch(rule!.content, /description: helper/);
  });
});
