import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { detectImwelContext } from './detect-context.js';

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

describe('detectImwelContext', () => {
  let root: string;

  before(async () => {
    root = await makeTempDir('imwel-detect-');
  });

  after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('returns neither when no .imwel markers exist', async () => {
    const dir = path.join(root, 'empty');
    await fs.mkdir(dir, { recursive: true });
    const result = await detectImwelContext(dir);
    assert.equal(result.kind, 'neither');
    assert.equal(result.root, null);
  });

  it('returns template for a valid manifest layout', async () => {
    const dir = path.join(root, 'template');
    await writeFile(
      path.join(dir, '.imwel', 'manifest.yaml'),
      'projects:\n  - name: app\n    path: app\n',
    );
    const nested = path.join(dir, 'app', 'src');
    await fs.mkdir(nested, { recursive: true });
    const result = await detectImwelContext(nested);
    assert.equal(result.kind, 'template');
    assert.equal(result.root, dir);
  });

  it('returns consumer for binding.yaml', async () => {
    const dir = path.join(root, 'consumer');
    await writeFile(path.join(dir, '.imwel', 'binding.yaml'), 'remote: org\n');
    const nested = path.join(dir, 'src');
    await fs.mkdir(nested, { recursive: true });
    const result = await detectImwelContext(nested);
    assert.equal(result.kind, 'consumer');
    assert.equal(result.root, dir);
  });

  it('returns ambiguous when the same .imwel has both files', async () => {
    const dir = path.join(root, 'ambiguous');
    await writeFile(
      path.join(dir, '.imwel', 'manifest.yaml'),
      'projects:\n  - name: app\n    path: app\n',
    );
    await writeFile(path.join(dir, '.imwel', 'binding.yaml'), 'remote: org\n');
    const result = await detectImwelContext(dir);
    assert.equal(result.kind, 'ambiguous');
    assert.equal(result.root, dir);
  });

  it('prefers the nearest ancestor .imwel over a farther template', async () => {
    const outer = path.join(root, 'nested-outer');
    await writeFile(
      path.join(outer, '.imwel', 'manifest.yaml'),
      'projects:\n  - name: outer\n    path: .\n',
    );
    const inner = path.join(outer, 'packages', 'app');
    await writeFile(path.join(inner, '.imwel', 'binding.yaml'), 'remote: org\n');
    const result = await detectImwelContext(inner);
    assert.equal(result.kind, 'consumer');
    assert.equal(result.root, inner);
  });

  it('returns neither for a manifest without projects', async () => {
    const dir = path.join(root, 'broken-manifest');
    await writeFile(path.join(dir, '.imwel', 'manifest.yaml'), 'conventions: {}\n');
    const result = await detectImwelContext(dir);
    assert.equal(result.kind, 'neither');
    assert.equal(result.root, dir);
  });
});
