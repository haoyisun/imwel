import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  inspectRenderedFiles,
  type RenderedFileWrite,
} from './apply-files.js';

async function withProject(
  files: Record<string, string>,
  run: (projectDir: string) => Promise<void>,
): Promise<void> {
  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-file-safety-'));
  try {
    for (const [relativePath, content] of Object.entries(files)) {
      const absolutePath = path.join(projectDir, relativePath);
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, content, 'utf8');
    }
    await run(projectDir);
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true });
  }
}

describe('inspectRenderedFiles', () => {
  it('classifies absent and unmanaged replace targets before first init history exists', async () => {
    await withProject(
      {
        '.cursor/rules/user.mdc': 'user-owned',
        '.cursor/rules/foreign.mdc': '---\ngeneratedBy: openspec\n---\nforeign-owned\n',
        '.cursor/rules/same.mdc': 'rendered',
      },
      async (projectDir) => {
        const writes: RenderedFileWrite[] = [
          { path: '.cursor/rules/new.mdc', content: 'rendered' },
          { path: '.cursor/rules/user.mdc', content: 'rendered' },
          { path: '.cursor/rules/foreign.mdc', content: 'rendered' },
          { path: '.cursor/rules/same.mdc', content: 'rendered' },
        ];

        const inspected = await inspectRenderedFiles(projectDir, writes);

        assert.deepEqual(
          inspected.map(({ path: targetPath, status }) => ({ path: targetPath, status })),
          [
            { path: '.cursor/rules/new.mdc', status: 'absent' },
            { path: '.cursor/rules/user.mdc', status: 'unmanaged-different' },
            { path: '.cursor/rules/foreign.mdc', status: 'unmanaged-different' },
            { path: '.cursor/rules/same.mdc', status: 'unmanaged-identical' },
          ],
        );
      },
    );
  });

  it('classifies managed targets by comparing current and history content', async () => {
    await withProject(
      {
        'clean.md': 'base',
        'dirty.md': 'local edit',
      },
      async (projectDir) => {
        const inspected = await inspectRenderedFiles(
          projectDir,
          [
            { path: 'clean.md', content: 'upstream' },
            { path: 'dirty.md', content: 'upstream' },
          ],
          {
            managedPaths: new Set(['clean.md', 'dirty.md']),
            historyContent: async (targetPath) => targetPath === 'clean.md' ? 'base' : 'base',
          },
        );

        assert.equal(inspected[0]?.status, 'managed-clean');
        assert.equal(inspected[1]?.status, 'managed-dirty');
      },
    );
  });

  it('preserves unrelated content around an upsert block without requiring overwrite', async () => {
    const existing = '# User instructions\n\nKeep this byte-for-byte.\n';
    await withProject({ 'AGENTS.md': existing }, async (projectDir) => {
      const [inspected] = await inspectRenderedFiles(projectDir, [
        {
          path: 'AGENTS.md',
          content: 'Managed instructions.',
          merge: 'upsert-block',
          blockId: 'project',
        },
      ]);

      assert.equal(inspected?.status, 'unmanaged-identical');
      assert.ok(inspected?.expectedContent.startsWith(existing.trimEnd()));
      assert.ok(inspected?.expectedContent.includes('Managed instructions.'));
    });
  });

  it('changes only the managed YAML list when ensuring an item', async () => {
    const existing = 'name: user-config\nimports:\n  - user.md\n';
    await withProject({ 'config.yaml': existing }, async (projectDir) => {
      const [inspected] = await inspectRenderedFiles(projectDir, [
        {
          path: 'config.yaml',
          content: 'imwel.md',
          merge: 'ensure-yaml-list',
          blockId: 'imports',
        },
      ]);

      assert.equal(inspected?.status, 'unmanaged-identical');
      assert.ok(inspected?.expectedContent.includes('name: user-config'));
      assert.ok(inspected?.expectedContent.includes('- user.md'));
      assert.ok(inspected?.expectedContent.includes('- imwel.md'));
    });
  });
});
