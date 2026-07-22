import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dedupeRenderedFiles } from './dedupe.js';

describe('dedupeRenderedFiles', () => {
  it('keeps a single file when identical content comes from multiple sources', () => {
    const { files, conflicts } = dedupeRenderedFiles([
      { path: 'AGENTS.md', content: 'same', sourceAdapterId: 'a', sourceProject: 'app' },
      { path: 'AGENTS.md', content: 'same', sourceAdapterId: 'a', sourceProject: 'python-std' },
    ]);
    assert.equal(files.length, 1);
    assert.equal(conflicts.length, 0);
  });

  it('reports a cross-source conflict with the contributing projects', () => {
    const { files, conflicts } = dedupeRenderedFiles([
      { path: 'AGENTS.md', content: 'from-app', sourceAdapterId: 'a', sourceProject: 'app' },
      { path: 'AGENTS.md', content: 'from-module', sourceAdapterId: 'a', sourceProject: 'python-std' },
    ]);
    assert.equal(files.length, 0);
    assert.equal(conflicts.length, 1);
    assert.deepEqual([...conflicts[0]!.projects].sort(), ['app', 'python-std']);
  });
});
