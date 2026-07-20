import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runGit } from './git.js';
import { collectHistorySignals } from './history-signals.js';

const COMMIT_ENV = {
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
};

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'imwel-history-'));
}

async function initRepo(dir: string): Promise<void> {
  await runGit(['init', '-q'], { cwd: dir });
  await runGit(['config', 'commit.gpgsign', 'false'], { cwd: dir });
}

async function commit(dir: string, files: Record<string, string>, message: string): Promise<void> {
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf8');
  }
  await runGit(['add', '-A'], { cwd: dir });
  await runGit(['commit', '-q', '-m', message], { cwd: dir, env: { ...process.env, ...COMMIT_ENV } });
}

describe('collectHistorySignals', () => {
  let root: string;

  beforeEach(async () => {
    root = await makeTempDir();
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('returns available:false when there is no .git directory', async () => {
    const signals = await collectHistorySignals(root);
    assert.equal(signals.available, false);
    assert.equal(signals.hotspots, undefined);
    // must not create anything
    await assert.rejects(fs.access(path.join(root, '.git')));
  });

  it('returns available:false for a repo with no commits', async () => {
    await initRepo(root);
    const signals = await collectHistorySignals(root);
    assert.equal(signals.available, false);
  });

  it('records hotspots by change frequency with stable ordering', async () => {
    await initRepo(root);
    // src/hot.ts changes 3 times, src/warm.ts twice, src/cold.ts once
    await commit(root, { 'src/hot.ts': '1', 'src/warm.ts': '1', 'src/cold.ts': '1' }, 'c1');
    await commit(root, { 'src/hot.ts': '2', 'src/warm.ts': '2' }, 'c2');
    await commit(root, { 'src/hot.ts': '3' }, 'c3');

    const signals = await collectHistorySignals(root);
    assert.equal(signals.available, true);
    assert.ok(signals.hotspots && signals.hotspots.length >= 3);
    assert.equal(signals.hotspots[0]!.path, 'src/hot.ts');
    assert.equal(signals.hotspots[0]!.changes, 3);
    assert.equal(signals.hotspots[1]!.path, 'src/warm.ts');
    assert.equal(signals.hotspots[1]!.changes, 2);
  });

  it('records co-change pairs that recur across commits', async () => {
    await initRepo(root);
    await commit(root, { 'a.ts': '1', 'b.ts': '1' }, 'c1');
    await commit(root, { 'a.ts': '2', 'b.ts': '2' }, 'c2');

    const signals = await collectHistorySignals(root);
    const pair = signals.coChanges?.find(
      (c) => c.files.includes('a.ts') && c.files.includes('b.ts'),
    );
    assert.ok(pair, `expected a.ts/b.ts co-change, got ${JSON.stringify(signals.coChanges)}`);
    assert.equal(pair!.together, 2);
  });

  it('marks confidence low for a repo with few commits', async () => {
    await initRepo(root);
    await commit(root, { 'a.ts': '1' }, 'c1');

    const signals = await collectHistorySignals(root);
    assert.equal(signals.available, true);
    assert.equal(signals.confidence, 'low');
    assert.equal(signals.commitsAnalyzed, 1);
  });
});
