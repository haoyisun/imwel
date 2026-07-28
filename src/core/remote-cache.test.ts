import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runGit } from './git.js';
import { listBranches } from './remote-cache.js';

const COMMIT_ENV = {
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
};

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe('listBranches', () => {
  let root: string;
  let bareDir: string;
  let cacheDir: string;

  beforeEach(async () => {
    root = await makeTempDir('imwel-remote-cache-');
    bareDir = path.join(root, 'origin.git');
    cacheDir = path.join(root, 'cache');

    await fs.mkdir(bareDir, { recursive: true });
    await runGit(['init', '-q', '--bare', '--initial-branch=main', bareDir]);
    // A real remote's HEAD symref only exists once something has pushed to it;
    // set it explicitly so cloning yields the `origin/HEAD -> origin/main`
    // remote-tracking entry that `git branch -r` short-names down to "origin".
    await runGit(['symbolic-ref', 'HEAD', 'refs/heads/main'], { gitDir: bareDir });

    const workDir = path.join(root, 'work');
    await fs.mkdir(workDir, { recursive: true });
    await runGit(['init', '-q', '--initial-branch=main'], { cwd: workDir });
    await runGit(['config', 'commit.gpgsign', 'false'], { cwd: workDir });
    await fs.writeFile(path.join(workDir, 'README.md'), '# test\n', 'utf8');
    await runGit(['add', '-A'], { cwd: workDir });
    await runGit(['commit', '-q', '-m', 'init'], { cwd: workDir, env: { ...process.env, ...COMMIT_ENV } });
    await runGit(['remote', 'add', 'origin', bareDir], { cwd: workDir });
    await runGit(['push', '-q', 'origin', 'main'], { cwd: workDir });

    await runGit(['clone', '-q', bareDir, cacheDir]);
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('returns only real branches, excluding the remote HEAD symref', async () => {
    const branches = await listBranches(cacheDir);
    assert.deepEqual(branches, ['main']);
  });
});
