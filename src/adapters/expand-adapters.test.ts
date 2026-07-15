import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  traeAdapter,
  qoderAdapter,
  codexAdapter,
  opencodeAdapter,
  windsurfAdapter,
  continueAdapter,
  clineAdapter,
  kiroAdapter,
  zcodeAdapter,
  geminiCliAdapter,
  copilotAdapter,
  aiderAdapter,
} from '../adapters/extra-adapters.js';
import { dedupeRenderedFiles } from '../adapters/strategies/dedupe.js';
import type { Artifact } from '../core/artifact-types.js';
import type { Adapter } from '../adapters/types.js';
import { upsertBlock } from '../core/marked-blocks.js';

const ruleArtifact: Artifact = {
  sourcePath: 'rules/example-rule.md',
  type: 'rule',
  optional: false,
  canonicalContent: '# Example\n\nUse TypeScript.',
};

const skillArtifact: Artifact = {
  sourcePath: 'skills/demo-skill',
  type: 'skill',
  optional: false,
  canonicalContent: '# Demo Skill\n',
  bundleFiles: [
    { relativePath: 'SKILL.md', content: '# Demo Skill\n\nDo the thing.' },
    { relativePath: 'refs.md', content: 'refs' },
  ],
};

function roundTripRule(adapter: Adapter, overrides?: Record<string, unknown>) {
  const rendered = adapter.render(ruleArtifact, overrides);
  assert.ok(rendered.length >= 1);
  const parsed = adapter.parseExisting(
    rendered.map((f) => ({ path: f.path, content: f.content })),
  );
  assert.equal(parsed.canonicalContent.trim(), ruleArtifact.canonicalContent.trim());
}

describe('batch-1 adapters round-trip', () => {
  it('trae rule and skill', () => {
    roundTripRule(traeAdapter, { globs: ['**/*.ts'], alwaysApply: true });
    const skills = traeAdapter.render(skillArtifact);
    assert.ok(skills.some((f) => f.path.includes('.trae/skills/demo-skill/SKILL.md')));
  });

  it('qoder rule and skill', () => {
    roundTripRule(qoderAdapter);
    const skills = qoderAdapter.render(skillArtifact);
    assert.ok(skills.some((f) => f.path.includes('.qoder/skills/')));
  });

  it('codex AGENTS.md typed block and .agents/skills', () => {
    const rendered = codexAdapter.render(ruleArtifact);
    assert.equal(rendered[0]!.merge, 'upsert-block');
    assert.ok(rendered[0]!.blockId?.endsWith(':rule'));
    const onDisk = upsertBlock('', rendered[0]!.blockId!, rendered[0]!.content);
    const parsed = codexAdapter.parseExisting([{ path: 'AGENTS.md', content: onDisk }]);
    assert.equal(parsed.canonicalContent.trim(), ruleArtifact.canonicalContent.trim());
    const skills = codexAdapter.render(skillArtifact);
    assert.ok(skills.some((f) => f.path.startsWith('.agents/skills/')));
  });

  it('opencode AGENTS.md and skills', () => {
    roundTripRule(opencodeAdapter);
    const skills = opencodeAdapter.render(skillArtifact);
    assert.ok(skills.some((f) => f.path.includes('.opencode/skills/')));
  });

  it('windsurf R2 skill uses model_decision', () => {
    roundTripRule(windsurfAdapter);
    const skill = windsurfAdapter.render(skillArtifact);
    assert.equal(skill.length, 1);
    assert.match(skill[0]!.content, /trigger:\s*model_decision/);
  });

  it('continue R3 skill goes to prompts', () => {
    roundTripRule(continueAdapter);
    const skill = continueAdapter.render(skillArtifact);
    assert.ok(skill[0]!.path.includes('.continue/prompts/'));
  });
});

describe('batch-2 adapters', () => {
  it('cline and kiro R2 skills', () => {
    roundTripRule(clineAdapter);
    roundTripRule(kiroAdapter);
    assert.match(clineAdapter.render(skillArtifact)[0]!.content, /alwaysApply:\s*false/);
    assert.match(kiroAdapter.render(skillArtifact)[0]!.content, /inclusion:\s*auto/);
  });

  it('zcode and gemini-cli', () => {
    roundTripRule(zcodeAdapter);
    const geminiSkill = geminiCliAdapter.render(skillArtifact);
    assert.equal(geminiSkill[0]!.warningLocaleKey, 'adapter.skill.r4Warning');
    assert.ok(geminiSkill[0]!.blockId?.endsWith(':skill'));
  });

  it('copilot splits by globs', () => {
    const root = copilotAdapter.render(ruleArtifact);
    assert.equal(root[0]!.path, '.github/copilot-instructions.md');
    const scoped = copilotAdapter.render(ruleArtifact, { globs: ['**/*.ts'] });
    assert.ok(scoped[0]!.path.endsWith('.instructions.md'));
    assert.match(scoped[0]!.content, /applyTo:/);
  });

  it('aider writes conventions and ensure-yaml-list for conf', () => {
    const rendered = aiderAdapter.render(ruleArtifact);
    assert.ok(rendered.some((f) => f.path === 'CONVENTIONS.md'));
    assert.ok(
      rendered.some((f) => f.path === '.aider.conf.yml' && f.merge === 'ensure-yaml-list'),
    );
  });
});

describe('dedupeRenderedFiles', () => {
  it('silently keeps one identical AGENTS.md upsert', () => {
    const result = dedupeRenderedFiles([
      {
        path: 'AGENTS.md',
        content: 'body',
        merge: 'upsert-block',
        blockId: 'example-rule:rule',
        sourceAdapterId: 'codex',
      },
      {
        path: 'AGENTS.md',
        content: 'body',
        merge: 'upsert-block',
        blockId: 'example-rule:rule',
        sourceAdapterId: 'opencode',
      },
    ]);
    assert.equal(result.files.length, 1);
    assert.equal(result.conflicts.length, 0);
  });

  it('reports conflict on divergent content', () => {
    const result = dedupeRenderedFiles([
      {
        path: 'AGENTS.md',
        content: 'a',
        merge: 'upsert-block',
        blockId: 'example-rule:rule',
        sourceAdapterId: 'codex',
      },
      {
        path: 'AGENTS.md',
        content: 'b',
        merge: 'upsert-block',
        blockId: 'example-rule:rule',
        sourceAdapterId: 'opencode',
      },
    ]);
    assert.equal(result.files.length, 0);
    assert.equal(result.conflicts.length, 1);
    assert.deepEqual(result.conflicts[0]!.adapterIds.sort(), ['codex', 'opencode']);
  });

  it('keeps different blockIds on same path', () => {
    const result = dedupeRenderedFiles([
      {
        path: 'AGENTS.md',
        content: 'a',
        merge: 'upsert-block',
        blockId: 'one:rule',
        sourceAdapterId: 'codex',
      },
      {
        path: 'AGENTS.md',
        content: 'b',
        merge: 'upsert-block',
        blockId: 'two:rule',
        sourceAdapterId: 'codex',
      },
    ]);
    assert.equal(result.files.length, 2);
    assert.equal(result.conflicts.length, 0);
  });
});
