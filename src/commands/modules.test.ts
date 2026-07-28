import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { installModules } from './modules.js';
import { pathExists } from '../core/fs-utils.js';
import type { Binding } from '../core/binding.js';

async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

async function scaffoldCacheDir(dir: string): Promise<void> {
  await writeFile(
    path.join(dir, '.imwel', 'manifest.yaml'),
    `conventions:
  rulesDir: rules
  skillsDir: skills
  agentsFile: agents.md
projects:
  - name: app
    path: app
    role: project
  - name: python-standards
    path: python-standards
    role: shared
  - name: code-standards
    path: code-standards
    role: shared
  - name: node-standards
    path: node-standards
    role: shared
`,
  );
  await writeFile(
    path.join(dir, 'app', 'rules', 'app-only.md'),
    '---\ndescription: app rule\n---\nApp-only body.\n',
  );
  await writeFile(
    path.join(dir, 'python-standards', 'rules', 'coding-style.md'),
    '---\ndescription: python style\n---\nPython coding style body.\n',
  );
  await writeFile(
    path.join(dir, 'code-standards', 'rules', 'coding-style.md'),
    '---\ndescription: generic style\n---\nDifferent coding style body.\n',
  );
  await writeFile(
    path.join(dir, 'node-standards', 'rules', 'node-style.md'),
    '---\ndescription: node style\n---\nNode style body.\n',
  );
}

function baseBinding(): Binding {
  return {
    remote: 'origin',
    branch: 'main',
    projects: [
      { name: 'app', mode: 'linked' },
      { name: 'python-standards', mode: 'subscribed' },
    ],
    tools: ['cursor'],
    lastSyncedCommit: 'deadbeef',
    lastSyncedHistoryCommit: 'deadbeef',
    artifacts: [],
  };
}

describe('installModules', () => {
  let cacheDir: string;
  let projectDir: string;

  before(async () => {
    cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-modules-cache-'));
    await scaffoldCacheDir(cacheDir);
  });

  after(async () => {
    await fs.rm(cacheDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-modules-project-'));
  });

  afterEach(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
  });

  it('aborts and writes nothing when the new module collides with a remaining project', async () => {
    const result = await installModules(
      projectDir,
      cacheDir,
      baseBinding(),
      ['code-standards'],
      ['app', 'python-standards'],
    );

    assert.equal(result.ok, false);
    assert.deepEqual(result.managed, []);
    assert.ok(!(await pathExists(path.join(projectDir, '.cursor', 'rules', 'coding-style.mdc'))));
  });

  it('installs only the new module when there is no cross-project conflict', async () => {
    const result = await installModules(
      projectDir,
      cacheDir,
      baseBinding(),
      ['node-standards'],
      ['app', 'python-standards'],
    );

    assert.equal(result.ok, true);
    assert.equal(result.managed.length, 1);
    assert.equal(result.managed[0]?.project, 'node-standards');
    assert.ok(await pathExists(path.join(projectDir, '.cursor', 'rules', 'node-style.mdc')));
    // The merge is only for conflict detection: files belonging to the
    // "remaining" comparison projects (app, python-standards) are not
    // (re-)written by this call.
    assert.ok(!(await pathExists(path.join(projectDir, '.cursor', 'rules', 'app-only.mdc'))));
    assert.ok(!(await pathExists(path.join(projectDir, '.cursor', 'rules', 'coding-style.mdc'))));
  });

  it('does not overwrite an unmanaged module target without authorization', async () => {
    const target = path.join(projectDir, '.cursor', 'rules', 'node-style.mdc');
    await writeFile(target, 'user-owned rule');

    const result = await installModules(
      projectDir,
      cacheDir,
      baseBinding(),
      ['node-standards'],
      ['app', 'python-standards'],
    );

    assert.equal(result.ok, false);
    assert.equal(await fs.readFile(target, 'utf8'), 'user-owned rule');
  });

  it('writes an unmanaged module target after explicit authorization', async () => {
    const target = path.join(projectDir, '.cursor', 'rules', 'node-style.mdc');
    await writeFile(target, 'user-owned rule');

    const result = await installModules(
      projectDir,
      cacheDir,
      baseBinding(),
      ['node-standards'],
      ['app', 'python-standards'],
      async () => true,
    );

    assert.equal(result.ok, true);
    assert.match(await fs.readFile(target, 'utf8'), /Node style body/);
  });
});
