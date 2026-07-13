import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { claudeCodeAdapter } from '../adapters/claude-code.js';
import type { Artifact } from '../core/artifact-types.js';

describe('claude-code adapter round-trip', () => {
  it('renders rule into CLAUDE.md block and parses back', () => {
    const artifact: Artifact = {
      sourcePath: 'rules/example-rule.md',
      type: 'rule',
      optional: false,
      canonicalContent: '# Example\n\nUse TypeScript.',
    };
    const rendered = claudeCodeAdapter.render(artifact);
    assert.equal(rendered[0]!.merge, 'upsert-block');
    const parsed = claudeCodeAdapter.parseExisting([
      { path: 'CLAUDE.md', content: rendered[0]!.content },
    ]);
    assert.equal(parsed.canonicalContent.trim(), artifact.canonicalContent.trim());
  });

  it('renders skill bundle paths', () => {
    const artifact: Artifact = {
      sourcePath: 'skills/example-skill',
      type: 'skill',
      optional: false,
      canonicalContent: '# Skill\n',
      bundleFiles: [
        { relativePath: 'SKILL.md', content: '# Skill\n' },
        { relativePath: 'refs.md', content: 'refs' },
      ],
    };
    const rendered = claudeCodeAdapter.render(artifact);
    assert.equal(rendered.length, 2);
    assert.ok(rendered.some((f) => f.path.endsWith('SKILL.md')));
    assert.ok(rendered.some((f) => f.path.endsWith('refs.md')));
  });
});
