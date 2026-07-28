import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { buildBindingInspection } from './binding-inspection.js';
import { writeBinding, type Binding } from './binding.js';
import { buildProposal, writePendingProposals } from './propose.js';

async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

function fixtureBinding(): Binding {
  return {
    remote: 'team',
    branch: 'main',
    projects: [
      { name: 'app', mode: 'linked' },
      { name: 'shared', mode: 'subscribed', frozen: true },
    ],
    tools: ['cursor'],
    lastSyncedCommit: 'remote-sha',
    lastSyncedHistoryCommit: 'history-sha',
    artifacts: [
      {
        sourcePath: 'rules/shared.md',
        project: 'shared',
        type: 'rule',
        optional: false,
        localEdit: false,
        installedPaths: {
          cursor: ['.cursor\\rules\\shared.mdc', '.cursor/rules/missing.mdc'],
        },
        targetOverrides: { cursor: { secretInternalValue: 'hidden' } },
      },
    ],
  };
}

describe('binding inspection view', () => {
  it('separates binding and contribution tracking in a stable sanitized shape', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-binding-view-'));
    try {
      await writeBinding(projectDir, fixtureBinding());
      await writeFile(
        path.join(projectDir, '.cursor', 'rules', 'shared.mdc'),
        'PRIVATE FILE BODY',
      );
      const proposal = {
        ...buildProposal(
          '.cursor/rules/shared.mdc',
          'team',
          'shared',
          'shared',
          'rule',
          'rules/shared.md',
          false,
          'cursor',
        ),
        pushed: { branch: 'imwel-push-1', commit: 'abc123' },
      };
      await writePendingProposals(projectDir, [proposal]);
      const home = path.join(projectDir, 'home');
      await writeFile(
        path.join(home, 'config.yaml'),
        YAML.stringify({
          remotes: {
            team: { url: 'https://user:password@example.invalid/private.git' },
          },
        }),
      );

      const view = await buildBindingInspection(projectDir);
      const serialized = JSON.stringify(view);

      assert.equal(view.schemaVersion, 1);
      assert.equal(view.binding?.remoteAlias, 'team');
      assert.equal(view.binding?.linkedProject, 'app');
      assert.deepEqual(view.binding?.modules, [{ name: 'shared', frozen: true }]);
      assert.deepEqual(view.binding?.managedArtifacts[0]?.installedPaths, [
        { tool: 'cursor', path: '.cursor/rules/missing.mdc', status: 'missing' },
        { tool: 'cursor', path: '.cursor/rules/shared.mdc', status: 'present' },
      ]);
      assert.equal(view.contributionTracking?.records[0]?.role, 'shared');
      assert.equal(view.contributionTracking?.records[0]?.status, 'pushed');
      assert.deepEqual(view.contributionTracking?.records[0]?.sourceFiles, [
        { path: '.cursor/rules/shared.mdc', status: 'present' },
      ]);
      assert.doesNotMatch(serialized, /password|example\.invalid|PRIVATE FILE BODY/);
      assert.doesNotMatch(serialized, /targetOverrides|localEdit|sourceId|localPath/);
      assert.equal(
        view.binding?.managedArtifacts[0]?.canonicalPath,
        view.contributionTracking?.records[0]?.canonicalPath,
      );
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });

  it('reports tracking without a binding and returns null sections when absent', async () => {
    const trackedDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-tracking-only-'));
    const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-binding-empty-'));
    try {
      await writePendingProposals(
        trackedDir,
        [
          buildProposal(
            'AGENTS.md',
            'team',
            'app',
            'project',
            'agents',
            'agents.md',
            false,
            'codex',
          ),
        ],
      );
      const tracked = await buildBindingInspection(trackedDir);
      assert.equal(tracked.binding, null);
      assert.equal(tracked.contributionTracking?.count, 1);
      assert.equal(tracked.contributionTracking?.records[0]?.sourceFiles[0]?.status, 'missing');

      assert.deepEqual(await buildBindingInspection(emptyDir), {
        schemaVersion: 1,
        binding: null,
        contributionTracking: null,
      });
    } finally {
      await fs.rm(trackedDir, { recursive: true, force: true });
      await fs.rm(emptyDir, { recursive: true, force: true });
    }
  });

  it('does not migrate legacy tracking, initialize history, or require Git', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-binding-offline-'));
    try {
      const trackingPath = path.join(projectDir, '.imwel', 'pending-proposals.yaml');
      const original = YAML.stringify({
        proposals: [
          {
            localPath: '.cursor/rules/legacy.mdc',
            remote: 'offline',
            project: 'app',
            type: 'rule',
            optional: false,
            tool: 'cursor',
          },
        ],
      });
      await writeFile(trackingPath, original);
      const cliPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'cli.js');
      const result = spawnSync(
        process.execPath,
        [cliPath, 'binding', 'show', '--json'],
        {
          cwd: projectDir,
          encoding: 'utf8',
          env: { ...process.env, PATH: '', IMWEL_HOME: path.join(projectDir, 'unavailable-home') },
        },
      );

      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).schemaVersion, 1);
      assert.equal(await fs.readFile(trackingPath, 'utf8'), original);
      await assert.rejects(fs.access(path.join(projectDir, '.imwel', 'history')));
      await assert.rejects(fs.access(path.join(projectDir, 'unavailable-home')));
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });
});
