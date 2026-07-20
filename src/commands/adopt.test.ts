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

describe('runAdopt --from (drafts)', () => {
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

  it('adopts drafts into canonical layout with -y (non-interactive)', async () => {
    await writeFile(root, '.imwel/drafts/rules/style.md', '# Style\n\nUse TypeScript everywhere.\n');

    const code = await runAdopt({ from: true, yes: true });

    assert.equal(code, 0);
    assert.ok(existsSync(path.join(root, '.imwel', 'adopted', 'rules', 'style.md')));
  });

  it('refuses to write silently when drafts have health issues and no -y (non-interactive)', async () => {
    // heading-only body → checkRuleHealth flags rule.empty
    await writeFile(root, '.imwel/drafts/rules/empty-ish.md', '# Title only\n');

    const code = await runAdopt({ from: true });

    assert.equal(code, 1);
    assert.ok(!existsSync(path.join(root, '.imwel', 'adopted')));
    // draft content is untouched
    const draft = await fs.readFile(path.join(root, '.imwel/drafts/rules/empty-ish.md'), 'utf8');
    assert.equal(draft, '# Title only\n');
  });

  it('reports no adoptable drafts when the directory is empty', async () => {
    const code = await runAdopt({ from: true });
    assert.equal(code, 0);
    assert.ok(!existsSync(path.join(root, '.imwel', 'adopted')));
  });
});
