import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { adapters } from '../adapters/index.js';
import { collectDrafts, consolidateExisting, writeConsolidated, outputPathFor } from './adopt.js';

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'imwel-adopt-'));
}

async function writeFile(root: string, rel: string, content: string): Promise<void> {
  const abs = path.join(root, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, 'utf8');
}

describe('consolidateExisting', () => {
  let root: string;

  beforeEach(async () => {
    root = await makeTempDir();
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('merges identical rules from multiple tools into one artifact', async () => {
    const body = '# Foo\n\nAlways use TypeScript.\n';
    await writeFile(root, '.cursor/rules/foo.mdc', body);
    await writeFile(root, '.trae/rules/foo.md', body);

    const result = await consolidateExisting(root, adapters);

    assert.equal(result.conflicts.length, 0);
    const foo = result.artifacts.find((a) => a.slug === 'foo' && a.type === 'rule');
    assert.ok(foo, 'expected a consolidated "foo" rule');
    assert.ok(foo!.tools.includes('cursor'));
    assert.ok(foo!.tools.includes('trae'));
    assert.equal(result.sourceCount, 2);
  });

  it('reports a conflict and writes nothing for it when tools disagree', async () => {
    await writeFile(root, '.cursor/rules/foo.mdc', '# Foo\n\nUse tabs.\n');
    await writeFile(root, '.trae/rules/foo.md', '# Foo\n\nUse spaces.\n');

    const result = await consolidateExisting(root, adapters);

    assert.equal(result.artifacts.length, 0);
    assert.equal(result.conflicts.length, 1);
    const conflict = result.conflicts[0]!;
    assert.equal(conflict.slug, 'foo');
    assert.ok(conflict.tools.includes('cursor'));
    assert.ok(conflict.tools.includes('trae'));
  });

  it('runs without a binding or remote (cold start)', async () => {
    await writeFile(root, '.cursor/rules/only.mdc', '# Only\n\nA lone rule.\n');
    // No .imwel/binding.yaml, no remote config.
    const result = await consolidateExisting(root, adapters);
    assert.equal(result.artifacts.length, 1);
    assert.equal(result.artifacts[0]!.slug, 'only');
  });

  it('returns an empty result when no rules are found', async () => {
    const result = await consolidateExisting(root, adapters);
    assert.deepEqual(result.artifacts, []);
    assert.deepEqual(result.conflicts, []);
    assert.equal(result.sourceCount, 0);
  });

  it('does not modify scanned source files (read-only)', async () => {
    const original = '# Foo\n\nOriginal content.\n';
    await writeFile(root, '.cursor/rules/foo.mdc', original);

    const result = await consolidateExisting(root, adapters);
    await writeConsolidated(path.join(root, '.imwel', 'adopted'), result.artifacts);

    const after = await fs.readFile(path.join(root, '.cursor/rules/foo.mdc'), 'utf8');
    assert.equal(after, original);
  });

  it('writes consolidated artifacts using template-repo layout', async () => {
    await writeFile(root, '.cursor/rules/foo.mdc', '# Foo\n\nBody.\n');
    const result = await consolidateExisting(root, adapters);
    const outDir = path.join(root, '.imwel', 'adopted');
    const written = await writeConsolidated(outDir, result.artifacts);

    assert.equal(outputPathFor(result.artifacts[0]!), 'rules/foo.md');
    assert.ok(written[0]!.endsWith(path.join('rules', 'foo.md')));
    const content = await fs.readFile(written[0]!, 'utf8');
    assert.match(content, /Body\./);
  });
});

describe('collectDrafts', () => {
  let root: string;

  beforeEach(async () => {
    root = await makeTempDir();
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('returns an empty array when the drafts directory is absent', async () => {
    const artifacts = await collectDrafts(path.join(root, '.imwel', 'drafts'));
    assert.deepEqual(artifacts, []);
  });

  it('collects rule and skill drafts as canonical candidates', async () => {
    const drafts = path.join(root, '.imwel', 'drafts');
    await writeFile(root, '.imwel/drafts/rules/style.md', '# Style\n\nUse TypeScript.\n');
    await writeFile(root, '.imwel/drafts/skills/helper/SKILL.md', '---\nname: helper\n---\nBody.\n');
    await writeFile(root, '.imwel/drafts/rules/empty.md', '   \n');

    const artifacts = await collectDrafts(drafts);

    const rule = artifacts.find((a) => a.type === 'rule' && a.slug === 'style');
    const skill = artifacts.find((a) => a.type === 'skill' && a.slug === 'helper');
    assert.ok(rule, 'expected a style rule draft');
    assert.ok(skill, 'expected a helper skill draft');
    assert.equal(rule!.sourceFiles[0], 'rules/style.md');
    assert.equal(skill!.sourceFiles[0], 'skills/helper/SKILL.md');
    // blank draft is skipped
    assert.ok(!artifacts.some((a) => a.slug === 'empty'));
  });

  it('adopts drafts into canonical layout via writeConsolidated', async () => {
    const drafts = path.join(root, '.imwel', 'drafts');
    await writeFile(root, '.imwel/drafts/rules/style.md', '# Style\n\nUse TypeScript.\n');
    const artifacts = await collectDrafts(drafts);
    const outDir = path.join(root, '.imwel', 'adopted');
    const written = await writeConsolidated(outDir, artifacts);

    assert.ok(written[0]!.endsWith(path.join('rules', 'style.md')));
    const content = await fs.readFile(written[0]!, 'utf8');
    assert.match(content, /Use TypeScript\./);
  });

  it('regression: a skill with only SKILL.md still harvests and writes correctly', async () => {
    await writeFile(root, '.cursor/skills/solo/SKILL.md', '# Solo\n\nBody.\n');
    const result = await consolidateExisting(root, adapters);
    const solo = result.artifacts.find((a) => a.type === 'skill' && a.slug === 'solo');
    assert.ok(solo, 'expected a solo skill artifact');
    assert.equal(solo!.canonicalContent, '# Solo\n\nBody.\n');
    // bundleFiles contains only SKILL.md; no accompanying files.
    assert.ok(solo!.bundleFiles && solo!.bundleFiles.length === 1);
    assert.equal(solo!.bundleFiles![0]!.relativePath, 'SKILL.md');

    const outDir = path.join(root, '.imwel', 'adopted');
    const written = await writeConsolidated(outDir, [solo!]);
    assert.equal(written.length, 1);
    assert.ok(written[0]!.endsWith(path.join('skills', 'solo', 'SKILL.md')));
  });
});
