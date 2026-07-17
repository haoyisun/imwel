import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { adapters } from '../adapters/index.js';
import { buildFingerprint } from './fingerprint.js';

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'imwel-scan-'));
}

async function writeFile(root: string, rel: string, content: string): Promise<void> {
  const abs = path.join(root, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, 'utf8');
}

describe('buildFingerprint', () => {
  let root: string;

  beforeEach(async () => {
    root = await makeTempDir();
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('detects languages and tooling configuration', async () => {
    await writeFile(root, 'package.json', '{}');
    await writeFile(root, 'src/a.ts', 'export const a = 1;\n');
    await writeFile(root, 'src/b.ts', 'export const b = 2;\n');
    await writeFile(root, 'src/c.js', 'module.exports = {};\n');
    await writeFile(root, 'vitest.config.ts', 'export default {};\n');
    await writeFile(root, '.eslintrc.json', '{}');
    await writeFile(root, '.prettierrc', '{}');
    await writeFile(root, '.github/workflows/ci.yml', 'name: ci\n');

    const fp = await buildFingerprint(root, adapters);

    assert.equal(fp.languages[0]?.ext, '.ts');
    assert.equal(fp.languages[0]?.files, 3);
    assert.ok(fp.manifests.includes('package.json'));
    assert.ok(fp.tooling.test.includes('vitest.config.ts'));
    assert.ok(fp.tooling.lint.includes('.eslintrc.json'));
    assert.ok(fp.tooling.format.includes('.prettierrc'));
    assert.ok(fp.tooling.ci.includes('.github/workflows/ci.yml'));
  });

  it('skips node_modules and other heavy directories', async () => {
    await writeFile(root, 'src/a.ts', 'export const a = 1;\n');
    await writeFile(root, 'node_modules/dep/index.ts', 'export default 1;\n');
    await writeFile(root, 'dist/bundle.ts', 'export default 1;\n');

    const fp = await buildFingerprint(root, adapters);

    assert.equal(fp.languages.find((l) => l.ext === '.ts')?.files, 1);
    assert.ok(!fp.topLevelDirs.includes('node_modules'));
    assert.ok(!fp.topLevelDirs.includes('dist'));
  });

  it('collects scattered rule locations via adapters', async () => {
    await writeFile(root, '.cursor/rules/style.mdc', '---\ndescription: x\n---\nBe consistent.\n');

    const fp = await buildFingerprint(root, adapters);

    assert.ok(
      fp.existingRules.some((r) => r.tool === 'cursor' && r.path.includes('.cursor/rules/style.mdc')),
      `expected a cursor rule location, got ${JSON.stringify(fp.existingRules)}`,
    );
  });

  it('is deterministic apart from the timestamp', async () => {
    await writeFile(root, 'src/a.ts', '1\n');
    await writeFile(root, 'src/b.py', '1\n');
    await writeFile(root, 'go.mod', 'module x\n');

    const first = await buildFingerprint(root, adapters);
    const second = await buildFingerprint(root, adapters);

    first.generatedAt = second.generatedAt;
    assert.deepEqual(first, second);
  });
});
