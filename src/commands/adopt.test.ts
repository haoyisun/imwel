import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runAdopt } from './adopt.js';

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'imwel-adopt-cmd-'));
}

async function writeFile(root: string, rel: string, content: string): Promise<void> {
  const abs = path.join(root, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, 'utf8');
}

describe('runAdopt --from (render drafts into tools)', () => {
  let root: string;
  let cwd: string;

  beforeEach(async () => {
    root = await makeTempDir();
    cwd = process.cwd();
    process.chdir(root);
  });

  afterEach(async () => {
    process.chdir(cwd);
    await fs.rm(root, { recursive: true, force: true });
  });

  it('renders flat-layout drafts into the selected tool with -y', async () => {
    await writeFile(root, '.imwel/drafts/rules/style.md', '# Style\n\nUse TypeScript everywhere.\n');

    const code = await runAdopt({ from: true, yes: true, tools: 'cursor' });

    assert.equal(code, 0);
    assert.ok(existsSync(path.join(root, '.cursor', 'rules', 'style.mdc')));
    // unmanaged: no canonical adopted dir, no binding
    assert.ok(!existsSync(path.join(root, '.imwel', 'adopted')));
    assert.ok(!existsSync(path.join(root, '.imwel', 'binding.yaml')));
  });

  it('renders a named draft box into tools', async () => {
    await writeFile(root, '.imwel/drafts/api-2026/rules/api.md', '# API\n\nVersion every endpoint.\n');

    const code = await runAdopt({ from: true, yes: true, tools: 'cursor' });

    assert.equal(code, 0);
    assert.ok(existsSync(path.join(root, '.cursor', 'rules', 'api.mdc')));
  });

  it('refuses to render silently when drafts have health issues and no -y (non-interactive)', async () => {
    await writeFile(root, '.imwel/drafts/rules/empty-ish.md', '# Title only\n');

    const code = await runAdopt({ from: true, tools: 'cursor' });

    assert.equal(code, 1);
    assert.ok(!existsSync(path.join(root, '.cursor')));
    const draft = await fs.readFile(path.join(root, '.imwel/drafts/rules/empty-ish.md'), 'utf8');
    assert.equal(draft, '# Title only\n');
  });

  it('errors on multiple named boxes in non-interactive mode', async () => {
    await writeFile(root, '.imwel/drafts/box-a/rules/a.md', '# A\n\nRule A body.\n');
    await writeFile(root, '.imwel/drafts/box-b/rules/b.md', '# B\n\nRule B body.\n');

    const code = await runAdopt({ from: true, yes: true, tools: 'cursor' });

    assert.equal(code, 1);
    assert.ok(!existsSync(path.join(root, '.cursor')));
  });

  it('reports no adoptable drafts when the directory is empty', async () => {
    const code = await runAdopt({ from: true, tools: 'cursor' });
    assert.equal(code, 0);
    assert.ok(!existsSync(path.join(root, '.cursor')));
  });
});
