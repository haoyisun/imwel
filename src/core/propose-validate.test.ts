import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateProposalPath } from './propose-validate.js';
import type { ManifestConventions } from './manifest.js';

const conventions: ManifestConventions = {
  rulesDir: 'rules',
  skillsDir: 'skills',
  agentsFile: 'agents.md',
};

describe('validateProposalPath', () => {
  it('accepts rule paths under rulesDir', () => {
    assert.equal(validateProposalPath('rules/foo.md', 'rule', conventions).ok, true);
  });

  it('rejects rule paths outside rulesDir', () => {
    const result = validateProposalPath('.cursor/rules/foo.mdc', 'rule', conventions);
    assert.equal(result.ok, false);
    assert.equal(result.expected, 'rules');
  });

  it('accepts skill paths under skillsDir', () => {
    assert.equal(validateProposalPath('skills/bar/SKILL.md', 'skill', conventions).ok, true);
  });

  it('accepts agents file path', () => {
    assert.equal(validateProposalPath('agents.md', 'agents', conventions).ok, true);
  });

  it('rejects agents path that is not agentsFile', () => {
    assert.equal(validateProposalPath('rules/agents.md', 'agents', conventions).ok, false);
  });
});
