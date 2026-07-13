import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cursorAdapter } from '../adapters/cursor.js';
import type { Artifact } from '../core/artifact-types.js';

describe('cursor adapter round-trip', () => {
  it('render then parseExisting preserves content and overrides', () => {
    const artifact: Artifact = {
      sourcePath: 'rules/example-rule.md',
      type: 'rule',
      optional: false,
      canonicalContent: '# Example Rule\n\nAlways write tests.',
      targetOverrides: { cursor: { globs: ['**/*.ts'], alwaysApply: true, description: 'Example' } },
    };
    const rendered = cursorAdapter.render(artifact, artifact.targetOverrides?.cursor as Record<string, unknown>);
    assert.equal(rendered.length, 1);
    const parsed = cursorAdapter.parseExisting([{ path: rendered[0]!.path, content: rendered[0]!.content }]);
    assert.equal(parsed.canonicalContent.trim(), artifact.canonicalContent.trim());
    assert.deepEqual(parsed.targetOverrides?.globs, ['**/*.ts']);
    assert.equal(parsed.targetOverrides?.alwaysApply, true);
    const rerendered = cursorAdapter.render(artifact, parsed.targetOverrides);
    assert.equal(rerendered[0]!.content, rendered[0]!.content);
  });
});
