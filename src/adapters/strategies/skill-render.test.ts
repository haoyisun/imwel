import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseSkillBundle, parsePromptFile } from './skill-render.js';
import { windsurfAdapter, geminiCliAdapter } from '../extra-adapters.js';

describe('parseSkillBundle', () => {
  it('returns bundleFiles for a multi-file skill directory', () => {
    const files = [
      { path: '.claude/skills/demo/SKILL.md', content: '# Demo\n\nDo the thing.' },
      { path: '.claude/skills/demo/references/foo.md', content: 'refs body' },
      { path: '.claude/skills/demo/evals/case-1.md', content: 'eval body' },
    ];
    const parsed = parseSkillBundle(files);
    assert.equal(parsed.canonicalContent, '# Demo\n\nDo the thing.');
    assert.ok(parsed.bundleFiles);
    assert.equal(parsed.bundleFiles!.length, 3);
    const paths = parsed.bundleFiles!.map((f) => f.relativePath).sort();
    assert.deepEqual(paths, ['SKILL.md', 'evals/case-1.md', 'references/foo.md']);
    const refs = parsed.bundleFiles!.find((f) => f.relativePath === 'references/foo.md');
    assert.equal(refs?.content, 'refs body');
  });

  it('falls back to a single SKILL.md when no accompanying files', () => {
    const parsed = parseSkillBundle([
      { path: '.cursor/skills/solo/SKILL.md', content: 'solo body' },
    ]);
    assert.equal(parsed.canonicalContent, 'solo body');
    assert.ok(parsed.bundleFiles);
    assert.equal(parsed.bundleFiles!.length, 1);
    assert.equal(parsed.bundleFiles![0]!.relativePath, 'SKILL.md');
  });

  it('handles backslash path separators', () => {
    const parsed = parseSkillBundle([
      { path: '.cursor\\skills\\demo\\SKILL.md', content: 'body' },
      { path: '.cursor\\skills\\demo\\refs.md', content: 'refs' },
    ]);
    const paths = parsed.bundleFiles!.map((f) => f.relativePath).sort();
    assert.deepEqual(paths, ['SKILL.md', 'refs.md']);
  });
});

describe('degraded skill targets omit bundleFiles', () => {
  it('R3 prompt-file parse does not return bundleFiles', () => {
    const parsed = parsePromptFile([{ path: '.continue/prompts/demo.md', content: 'body' }]);
    assert.equal(parsed.bundleFiles, undefined);
    assert.equal(parsed.canonicalContent, 'body');
  });

  it('R2 windsurf parseExisting does not return bundleFiles for a skill rule', () => {
    const rendered = windsurfAdapter.render(
      {
        sourcePath: 'skills/demo-skill',
        type: 'skill',
        optional: false,
        canonicalContent: '# Demo\n',
        bundleFiles: [{ relativePath: 'SKILL.md', content: '# Demo\n' }],
      },
      {},
    );
    const parsed = windsurfAdapter.parseExisting(
      rendered.map((f) => ({ path: f.path, content: f.content })),
    );
    assert.equal(parsed.bundleFiles, undefined);
  });

  it('R4 gemini-cli parseExisting does not return bundleFiles for a skill block', () => {
    const rendered = geminiCliAdapter.render({
      sourcePath: 'skills/demo-skill',
      type: 'skill',
      optional: false,
      canonicalContent: '# Demo\n',
      bundleFiles: [{ relativePath: 'SKILL.md', content: '# Demo\n' }],
    });
    const parsed = geminiCliAdapter.parseExisting(
      rendered.map((f) => ({ path: f.path, content: f.content })),
    );
    assert.equal(parsed.bundleFiles, undefined);
  });
});
