import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readBinding, writeBinding, type Binding } from '../core/binding.js';
import { pathExists } from '../core/fs-utils.js';
import {
  commitInstalledFiles,
  ensureHistoryRepo,
  listFilesAtCommit,
} from '../core/history.js';
import {
  applyToolsPlan,
  planToolsChange,
  resolveToolsSelection,
} from './tools.js';

async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

async function scaffoldTemplate(cacheDir: string, conflicting = false): Promise<void> {
  await writeFile(
    path.join(cacheDir, '.imwel', 'manifest.yaml'),
    `conventions:
  rulesDir: rules
  skillsDir: skills
  agentsFile: agents.md
projects:
  - name: app
    path: app
    role: project
  - name: shared
    path: shared
    role: shared
  - name: frozen
    path: frozen
    role: shared
`,
  );
  await writeFile(
    path.join(cacheDir, 'app', 'rules', 'coding.md'),
    '---\ndescription: app coding\n---\nApp coding.\n',
  );
  await writeFile(
    path.join(cacheDir, 'app', 'rules', 'optional.md'),
    '---\ndescription: optional\noptional: true\n---\nOptional rule.\n',
  );
  await writeFile(
    path.join(cacheDir, 'shared', 'rules', conflicting ? 'coding.md' : 'shared.md'),
    `---\ndescription: shared\n---\n${conflicting ? 'Conflicting coding.' : 'Shared rule.'}\n`,
  );
  await writeFile(
    path.join(cacheDir, 'frozen', 'rules', 'frozen.md'),
    '---\ndescription: frozen\n---\nFrozen rule.\n',
  );
}

function baseBinding(): Binding {
  return {
    remote: 'origin',
    branch: 'main',
    projects: [
      { name: 'app', mode: 'linked' },
      { name: 'shared', mode: 'subscribed' },
      { name: 'frozen', mode: 'subscribed', frozen: true },
    ],
    tools: ['cursor'],
    lastSyncedCommit: 'upstream-before-tools',
    lastSyncedHistoryCommit: '',
    artifacts: [
      {
        project: 'app',
        sourcePath: 'rules/coding.md',
        type: 'rule',
        optional: false,
        localEdit: false,
        installedPaths: { cursor: ['.cursor/rules/coding.mdc'] },
      },
      {
        project: 'app',
        sourcePath: 'rules/optional.md',
        type: 'rule',
        optional: true,
        localEdit: false,
        installedPaths: { cursor: ['.cursor/rules/optional.mdc'] },
      },
      {
        project: 'shared',
        sourcePath: 'rules/shared.md',
        type: 'rule',
        optional: false,
        localEdit: false,
        installedPaths: { cursor: ['.cursor/rules/shared.mdc'] },
      },
      {
        project: 'frozen',
        sourcePath: 'rules/frozen.md',
        type: 'rule',
        optional: false,
        localEdit: false,
        installedPaths: { cursor: ['.cursor/rules/frozen.mdc'] },
      },
    ],
  };
}

describe('resolveToolsSelection', () => {
  it('adds and removes explicit tools without changing unspecified tools', () => {
    const result = resolveToolsSelection(
      ['cursor', 'codex'],
      { add: 'claude-code', remove: 'cursor' },
      ['cursor', 'claude-code', 'codex'],
    );

    assert.deepEqual(result, {
      selected: ['codex', 'claude-code'],
      added: ['claude-code'],
      removed: ['cursor'],
    });
  });

  it('rejects unknown, overlapping, and empty selections', () => {
    assert.throws(
      () => resolveToolsSelection(['cursor'], { add: 'unknown' }, ['cursor']),
      /unknown/i,
    );
    assert.throws(
      () =>
        resolveToolsSelection(
          ['cursor'],
          { add: 'cursor', remove: 'cursor' },
          ['cursor'],
        ),
      /both/i,
    );
    assert.throws(
      () => resolveToolsSelection(['cursor'], { remove: 'cursor' }, ['cursor']),
      /at least one/i,
    );
  });
});

describe('tools change plans', () => {
  let projectDir: string;
  let cacheDir: string;

  beforeEach(async () => {
    projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-tools-project-'));
    cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-tools-cache-'));
    await scaffoldTemplate(cacheDir);
  });

  afterEach(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
    await fs.rm(cacheDir, { recursive: true, force: true });
  });

  it('renders all non-frozen bound projects for only the added tool', async () => {
    const binding = baseBinding();
    const plan = await planToolsChange(
      projectDir,
      cacheDir,
      binding,
      ['cursor', 'claude-code'],
      false,
    );

    assert.equal(plan.conflicts.length, 0);
    assert.deepEqual(plan.added, ['claude-code']);
    assert.ok(plan.writeFiles.every((file) => file.path === 'CLAUDE.md'));
    assert.ok(plan.writeFiles.some((file) => file.blockId?.includes('coding')));
    assert.ok(plan.writeFiles.some((file) => file.blockId?.includes('optional')));
    assert.ok(plan.writeFiles.some((file) => file.blockId?.includes('shared')));
    assert.ok(!plan.writeFiles.some((file) => file.blockId?.includes('frozen')));

    const coding = plan.nextBinding.artifacts.find(
      (artifact) => artifact.project === 'app' && artifact.sourcePath === 'rules/coding.md',
    );
    assert.deepEqual(coding?.installedPaths.cursor, ['.cursor/rules/coding.mdc']);
    assert.deepEqual(coding?.installedPaths['claude-code'], ['CLAUDE.md']);
    assert.deepEqual(plan.nextBinding.projects, binding.projects);
    assert.equal(plan.nextBinding.remote, binding.remote);
    assert.equal(plan.nextBinding.branch, binding.branch);
    assert.equal(plan.nextBinding.lastSyncedCommit, binding.lastSyncedCommit);
  });

  it('reports unmanaged-file safety without writing it', async () => {
    const binding = baseBinding();
    const initialPlan = await planToolsChange(
      projectDir,
      cacheDir,
      binding,
      ['cursor', 'claude-code'],
      false,
    );
    const blockId = initialPlan.writeFiles.find((file) => file.content.includes('App coding'))?.blockId;
    assert.ok(blockId);
    const target = path.join(projectDir, 'CLAUDE.md');
    await writeFile(
      target,
      `<!-- imwel:block:${blockId} -->\nuser-owned\n<!-- /imwel:block:${blockId} -->\n`,
    );

    const plan = await planToolsChange(
      projectDir,
      cacheDir,
      binding,
      ['cursor', 'claude-code'],
      false,
    );

    assert.equal(
      plan.writeFiles.find((file) => file.path === 'CLAUDE.md')?.status,
      'unmanaged-different',
    );
    assert.match(await fs.readFile(target, 'utf8'), /user-owned/);
  });

  it('aborts a multi-project render conflict without a write plan', async () => {
    await fs.rm(cacheDir, { recursive: true, force: true });
    cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-tools-conflict-'));
    await scaffoldTemplate(cacheDir, true);
    const binding = baseBinding();
    binding.artifacts = binding.artifacts.filter((artifact) => artifact.project !== 'shared');
    binding.artifacts.push({
      project: 'shared',
      sourcePath: 'rules/coding.md',
      type: 'rule',
      optional: false,
      localEdit: false,
      installedPaths: { cursor: ['.cursor/rules/coding.mdc'] },
    });

    const plan = await planToolsChange(
      projectDir,
      cacheDir,
      binding,
      ['cursor', 'claude-code'],
      false,
    );

    assert.ok(plan.conflicts.length > 0);
    assert.deepEqual(plan.writeFiles, []);
    assert.ok(!(await pathExists(path.join(projectDir, '.claude', 'rules', 'coding.md'))));
  });

  it('keeps removed-tool files by default and drops only their management keys', async () => {
    const binding = baseBinding();
    binding.tools = ['cursor', 'claude-code'];
    binding.artifacts[0]!.installedPaths['claude-code'] = ['.claude/rules/coding.md'];
    await writeFile(path.join(projectDir, '.claude', 'rules', 'coding.md'), 'rendered');

    const plan = await planToolsChange(
      projectDir,
      cacheDir,
      binding,
      ['cursor'],
      false,
    );

    assert.deepEqual(plan.keepPaths, ['.claude/rules/coding.md']);
    assert.deepEqual(plan.deletePaths, []);
    assert.equal(
      plan.nextBinding.artifacts[0]!.installedPaths['claude-code'],
      undefined,
    );
  });

  it('deletes only exact removed paths with no remaining managed reference', async () => {
    const binding = baseBinding();
    binding.tools = ['cursor', 'claude-code'];
    binding.artifacts[0]!.installedPaths['claude-code'] = [
      '.claude/rules/coding.md',
      'AGENTS.md',
    ];
    binding.artifacts[1]!.installedPaths.cursor = ['AGENTS.md'];

    const plan = await planToolsChange(
      projectDir,
      cacheDir,
      binding,
      ['cursor'],
      true,
    );

    assert.deepEqual(plan.deletePaths, ['.claude/rules/coding.md']);
    assert.deepEqual(plan.sharedPaths, ['AGENTS.md']);
  });

  it('applies keep removal as an unmanaged file and removes it from history', async () => {
    const binding = baseBinding();
    binding.tools = ['cursor', 'claude-code'];
    binding.artifacts[0]!.installedPaths['claude-code'] = ['CLAUDE.md'];
    await writeFile(path.join(projectDir, '.cursor', 'rules', 'coding.mdc'), 'cursor');
    await writeFile(path.join(projectDir, 'CLAUDE.md'), 'claude');
    await ensureHistoryRepo(projectDir);
    binding.lastSyncedHistoryCommit = await commitInstalledFiles(
      projectDir,
      ['.cursor/rules/coding.mdc', 'CLAUDE.md'],
      'initial',
    );
    await writeBinding(projectDir, binding);

    const plan = await planToolsChange(projectDir, cacheDir, binding, ['cursor'], false);
    await applyToolsPlan(projectDir, plan);

    assert.equal(await fs.readFile(path.join(projectDir, 'CLAUDE.md'), 'utf8'), 'claude');
    const updated = await readBinding(projectDir);
    assert.deepEqual(updated?.tools, ['cursor']);
    assert.equal(updated?.artifacts[0]!.installedPaths['claude-code'], undefined);
    assert.deepEqual(
      await listFilesAtCommit(projectDir, updated!.lastSyncedHistoryCommit),
      ['.cursor/rules/coding.mdc'],
    );
  });

  it('applies delete removal but preserves a path referenced by a remaining tool', async () => {
    const binding = baseBinding();
    binding.tools = ['cursor', 'claude-code'];
    binding.artifacts[0]!.installedPaths['claude-code'] = ['CLAUDE.md', 'AGENTS.md'];
    binding.artifacts[1]!.installedPaths.cursor = ['AGENTS.md'];
    await writeFile(path.join(projectDir, 'CLAUDE.md'), 'claude');
    await writeFile(path.join(projectDir, 'AGENTS.md'), 'shared');
    await ensureHistoryRepo(projectDir);
    binding.lastSyncedHistoryCommit = await commitInstalledFiles(
      projectDir,
      ['CLAUDE.md', 'AGENTS.md'],
      'initial',
    );

    const plan = await planToolsChange(projectDir, cacheDir, binding, ['cursor'], true);
    await applyToolsPlan(projectDir, plan);

    assert.ok(!(await pathExists(path.join(projectDir, 'CLAUDE.md'))));
    assert.equal(await fs.readFile(path.join(projectDir, 'AGENTS.md'), 'utf8'), 'shared');
  });

  it('applies files, history, and binding while preserving unrelated state', async () => {
    const binding = baseBinding();
    await writeFile(
      path.join(projectDir, '.cursor', 'rules', 'coding.mdc'),
      'existing cursor output',
    );
    await writeFile(path.join(projectDir, '.cursor', 'rules', 'optional.mdc'), 'optional');
    await writeFile(path.join(projectDir, '.cursor', 'rules', 'shared.mdc'), 'shared');
    await writeFile(path.join(projectDir, '.cursor', 'rules', 'frozen.mdc'), 'frozen');
    await writeFile(path.join(projectDir, '.cursor', 'commands', 'imwel.md'), 'command pack');

    const plan = await planToolsChange(
      projectDir,
      cacheDir,
      binding,
      ['cursor', 'claude-code'],
      false,
    );
    await applyToolsPlan(projectDir, plan);

    assert.ok(await pathExists(path.join(projectDir, 'CLAUDE.md')));
    const claudeContent = await fs.readFile(path.join(projectDir, 'CLAUDE.md'), 'utf8');
    assert.match(claudeContent, /App coding/);
    assert.match(claudeContent, /Optional rule/);
    assert.match(claudeContent, /Shared rule/);
    assert.doesNotMatch(claudeContent, /Frozen rule/);
    assert.equal(
      await fs.readFile(path.join(projectDir, '.cursor', 'rules', 'coding.mdc'), 'utf8'),
      'existing cursor output',
    );
    assert.equal(
      await fs.readFile(path.join(projectDir, '.cursor', 'commands', 'imwel.md'), 'utf8'),
      'command pack',
    );

    const rawBinding = await fs.readFile(
      path.join(projectDir, '.imwel', 'binding.yaml'),
      'utf8',
    );
    assert.match(rawBinding, /claude-code/);
    assert.equal(plan.nextBinding.lastSyncedCommit, binding.lastSyncedCommit);
    assert.ok(plan.nextBinding.lastSyncedHistoryCommit);
  });
});
