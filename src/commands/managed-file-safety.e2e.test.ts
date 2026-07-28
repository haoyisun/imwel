import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import { runGit } from '../core/git.js';
import { pathExists } from '../core/fs-utils.js';

async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

describe('managed file safety CLI flow', () => {
  it('protects an existing Cursor rule and visibly restores it through sync', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-managed-safety-e2e-'));
    const templateDir = path.join(root, 'template');
    const projectDir = path.join(root, 'consumer');
    const imwelHome = path.join(root, 'home');
    const cliPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'cli.js');
    const env = {
      ...process.env,
      IMWEL_HOME: imwelHome,
      IMWEL_LOCALE: 'en',
    };
    const runCli = (args: string[], cwd: string) =>
      execa(process.execPath, [cliPath, ...args], { cwd, env, reject: false });

    try {
      await writeFile(
        path.join(templateDir, '.imwel', 'manifest.yaml'),
        `projects:
  - name: app
    path: app
    role: project
`,
      );
      await writeFile(
        path.join(templateDir, 'app', 'rules', 'coding-style.md'),
        `---
description: Apply the shared coding style
---
Use the template coding style.
`,
      );
      await runGit(['init', '-b', 'main'], { cwd: templateDir });
      await runGit(['config', 'user.email', 'test@example.com'], { cwd: templateDir });
      await runGit(['config', 'user.name', 'Test'], { cwd: templateDir });
      await runGit(['add', '.'], { cwd: templateDir });
      await runGit(['commit', '-m', 'initial'], { cwd: templateDir });

      await fs.mkdir(projectDir, { recursive: true });
      const addRemote = await runCli(['remote', 'add', 'test', templateDir], projectDir);
      assert.equal(addRemote.exitCode, 0, addRemote.stderr);

      const targetPath = path.join(projectDir, '.cursor', 'rules', 'coding-style.mdc');
      await writeFile(targetPath, 'user-owned Cursor rule\n');
      const initArgs = [
        'init',
        '--tools',
        'cursor',
        '--remote',
        'test',
        '--branch',
        'main',
        '--project',
        'app',
        '--no-optional',
        '--no-command-pack',
      ];

      const refusedInit = await runCli(initArgs, projectDir);
      assert.equal(refusedInit.exitCode, 1);
      assert.match(`${refusedInit.stdout}\n${refusedInit.stderr}`, /unmanaged content differs/);
      assert.equal(await fs.readFile(targetPath, 'utf8'), 'user-owned Cursor rule\n');
      assert.equal(await pathExists(path.join(projectDir, '.imwel', 'binding.yaml')), false);

      const confirmedInit = await runCli([...initArgs, '--yes'], projectDir);
      assert.equal(confirmedInit.exitCode, 0, confirmedInit.stderr);
      assert.match(await fs.readFile(targetPath, 'utf8'), /template coding style/);

      await fs.rm(targetPath);
      const bindingPath = path.join(projectDir, '.imwel', 'binding.yaml');
      const bindingBeforeRefusal = await fs.readFile(bindingPath, 'utf8');
      const refusedSync = await runCli(['sync'], projectDir);
      assert.equal(refusedSync.exitCode, 1);
      assert.match(`${refusedSync.stdout}\n${refusedSync.stderr}`, /will restore/);
      assert.equal(await pathExists(targetPath), false);
      assert.equal(await fs.readFile(bindingPath, 'utf8'), bindingBeforeRefusal);

      const confirmedSync = await runCli(['sync', '--yes'], projectDir);
      assert.equal(confirmedSync.exitCode, 0, confirmedSync.stderr);
      assert.match(await fs.readFile(targetPath, 'utf8'), /template coding style/);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
