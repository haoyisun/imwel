import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldUseDirectPush,
  buildCompareUrl,
  mergeMultiToolParseResults,
} from './push.js';

describe('push directPush flag', () => {
  it('defaults to branch workflow when directPush is unset', () => {
    assert.equal(shouldUseDirectPush(undefined), false);
    assert.equal(shouldUseDirectPush(false), false);
  });

  it('allows direct push only when explicitly enabled', () => {
    assert.equal(shouldUseDirectPush(true), true);
  });

  it('builds github compare URL', () => {
    const url = buildCompareUrl('git@github.com:acme/templates.git', 'main', 'imwel-push-abc');
    assert.ok(url.includes('github.com/acme/templates/compare/main...imwel-push-abc'));
  });
});

describe('mergeMultiToolParseResults', () => {
  it('merges targetOverrides when canonical content matches', () => {
    const merged = mergeMultiToolParseResults([
      { tool: 'cursor', canonicalContent: 'body', targetOverrides: { alwaysApply: true } },
      { tool: 'claude-code', canonicalContent: 'body', targetOverrides: { import: true } },
    ]);
    assert.equal(merged.ok, true);
    if (merged.ok) {
      assert.equal(merged.canonicalContent, 'body');
      assert.deepEqual(merged.targetOverrides, {
        cursor: { alwaysApply: true },
        'claude-code': { import: true },
      });
    }
  });

  it('reports conflict when canonical content differs', () => {
    const merged = mergeMultiToolParseResults([
      { tool: 'cursor', canonicalContent: 'a' },
      { tool: 'claude-code', canonicalContent: 'b' },
    ]);
    assert.equal(merged.ok, false);
    if (!merged.ok) {
      assert.deepEqual(merged.tools, ['cursor', 'claude-code']);
    }
  });
});
