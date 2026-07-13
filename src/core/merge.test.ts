import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { threeWayMergeText } from '../core/merge.js';

describe('threeWayMergeText', () => {
  it('auto-merges non-overlapping changes', async () => {
    const base = 'section A\nmiddle unchanged\nsection B\n';
    const ours = 'section A-local\nmiddle unchanged\nsection B\n';
    const theirs = 'section A\nmiddle unchanged\nsection B-remote\n';
    const result = await threeWayMergeText(base, ours, theirs);
    assert.equal(result.hasConflicts, false);
    assert.ok(result.merged.includes('section A-local'));
    assert.ok(result.merged.includes('section B-remote'));
  });

  it('surfaces conflict markers for overlapping changes', async () => {
    const base = 'shared line\n';
    const ours = 'local change\n';
    const theirs = 'remote change\n';
    const result = await threeWayMergeText(base, ours, theirs);
    assert.equal(result.hasConflicts, true);
    assert.ok(result.merged.includes('<<<<<<<'));
    assert.ok(result.merged.includes('>>>>>>>'));
  });
});
