import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyProvenance, filterUserArtifacts } from './provenance.js';

describe('classifyProvenance', () => {
  it('marks imwel frontmatter as MINE', () => {
    const r = classifyProvenance({
      path: '.cursor/commands/anything.md',
      content: '---\ngeneratedBy: imwel\n---\n# hi',
    });
    assert.equal(r.provenance, 'MINE');
    assert.equal(r.reasonKey, 'provenance.reason.mine.marker');
  });

  it('marks imwel-* namespace as MINE even without frontmatter', () => {
    const r = classifyProvenance({ path: '.cursor/skills/imwel-extract/SKILL.md' });
    assert.equal(r.provenance, 'MINE');
    assert.equal(r.reasonKey, 'provenance.reason.mine.namespace');
  });

  it('marks openspec namespace as FOREIGN', () => {
    const r = classifyProvenance({ path: '.cursor/skills/openspec-apply-change/SKILL.md' });
    assert.equal(r.provenance, 'FOREIGN');
  });

  it('marks a non-imwel generatedBy as FOREIGN', () => {
    const r = classifyProvenance({
      path: '.cursor/rules/x.mdc',
      content: '---\ngeneratedBy: someTool\n---\nbody',
    });
    assert.equal(r.provenance, 'FOREIGN');
  });

  it('treats ordinary user rules as USER', () => {
    const r = classifyProvenance({
      path: '.cursor/rules/graphql-conventions.mdc',
      content: '---\ndescription: GraphQL\n---\nbody',
    });
    assert.equal(r.provenance, 'USER');
  });

  it('biases uncertain artifacts toward USER', () => {
    const r = classifyProvenance({ path: '.cursor/rules/unknown.mdc' });
    assert.equal(r.provenance, 'USER');
  });
});

describe('filterUserArtifacts', () => {
  it('keeps only USER and reports exclusions', () => {
    const { user, excluded } = filterUserArtifacts([
      { path: '.cursor/rules/mine.mdc', content: 'body' },
      { path: '.cursor/skills/imwel-extract/SKILL.md' },
      { path: '.cursor/skills/openspec-x/SKILL.md' },
    ]);
    assert.equal(user.length, 1);
    assert.equal(user[0]!.path, '.cursor/rules/mine.mdc');
    assert.equal(excluded.length, 2);
  });
});
