import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  findMissingManagedFiles,
  planRemovals,
  writeSyncResults,
  type SyncPlan,
} from './sync-engine.js';
import type { Binding, ManagedArtifact } from './binding.js';
import { commitInstalledFiles } from './history.js';

function artifact(project: string, sourcePath: string): ManagedArtifact {
  return { project, sourcePath, type: 'rule', optional: false, localEdit: false, installedPaths: {} };
}

describe('planRemovals', () => {
  it('matches on the (project, sourcePath) key, not sourcePath alone', () => {
    const plan: SyncPlan = {
      items: [{ project: 'a', sourcePath: 'rules/shared.md', status: 'removed' }],
      artifacts: [],
      remoteCommit: 'HEAD',
      restorations: [],
    };
    const binding: Binding = {
      remote: 'r',
      branch: 'main',
      projects: [
        { name: 'a', mode: 'subscribed' },
        { name: 'b', mode: 'linked' },
      ],
      tools: ['cursor'],
      lastSyncedCommit: 'x',
      lastSyncedHistoryCommit: 'y',
      artifacts: [artifact('a', 'rules/shared.md'), artifact('b', 'rules/shared.md')],
    };
    const removed = planRemovals(plan, binding);
    // Only project "a"'s copy is removed; project "b"'s same-named file survives.
    assert.equal(removed.length, 1);
    assert.equal(removed[0]!.project, 'a');
  });
});

describe('findMissingManagedFiles', () => {
  it('finds missing linked-project and subscribed-module paths recorded in history', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-sync-missing-'));
    try {
      const linkedPath = '.cursor/rules/app.mdc';
      const modulePath = '.cursor/rules/shared.mdc';
      for (const installedPath of [linkedPath, modulePath]) {
        const absolutePath = path.join(projectDir, installedPath);
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.writeFile(absolutePath, installedPath, 'utf8');
      }
      const historyCommit = await commitInstalledFiles(
        projectDir,
        [linkedPath, modulePath],
        'test baseline',
      );
      await fs.rm(path.join(projectDir, linkedPath));
      await fs.rm(path.join(projectDir, modulePath));

      const binding: Binding = {
        remote: 'r',
        branch: 'main',
        projects: [
          { name: 'app', mode: 'linked' },
          { name: 'shared', mode: 'subscribed' },
        ],
        tools: ['cursor'],
        lastSyncedCommit: 'upstream',
        lastSyncedHistoryCommit: historyCommit,
        artifacts: [
          {
            ...artifact('app', 'rules/app.md'),
            installedPaths: { cursor: [linkedPath] },
          },
          {
            ...artifact('shared', 'rules/shared.md'),
            installedPaths: { cursor: [modulePath] },
          },
        ],
      };

      const missing = await findMissingManagedFiles(projectDir, binding);

      assert.deepEqual(
        missing.map((item) => ({ path: item.path, project: item.project })),
        [
          { path: linkedPath, project: 'app' },
          { path: modulePath, project: 'shared' },
        ],
      );
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });

  it('restores a confirmed missing managed path and advances history', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-sync-restore-'));
    try {
      const installedPath = '.cursor/rules/app.mdc';
      const absolutePath = path.join(projectDir, installedPath);
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, 'old content', 'utf8');
      const historyCommit = await commitInstalledFiles(projectDir, [installedPath], 'baseline');
      await fs.rm(absolutePath);

      const binding: Binding = {
        remote: 'r',
        branch: 'main',
        projects: [{ name: 'app', mode: 'linked' }],
        tools: ['cursor'],
        lastSyncedCommit: 'old-upstream',
        lastSyncedHistoryCommit: historyCommit,
        artifacts: [
          {
            ...artifact('app', 'rules/app.md'),
            installedPaths: { cursor: [installedPath] },
          },
        ],
      };
      const plan: SyncPlan = {
        items: [],
        artifacts: [
          {
            project: 'app',
            sourcePath: 'rules/app.md',
            type: 'rule',
            optional: false,
            canonicalContent: '# App\n\nrestored content\n',
          },
        ],
        remoteCommit: 'new-upstream',
        restorations: [
          { path: installedPath, project: 'app', sourcePath: 'rules/app.md' },
        ],
      };

      const result = await writeSyncResults(projectDir, binding, plan, ['cursor']);

      assert.match(await fs.readFile(absolutePath, 'utf8'), /restored content/);
      assert.notEqual(result.binding.lastSyncedHistoryCommit, historyCommit);
      assert.equal(result.binding.lastSyncedCommit, 'new-upstream');
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });
});
