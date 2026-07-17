import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadFirstPartySkills } from './first-party-assets.js';
import { readBinding } from './binding.js';
import { applyRenderedFiles } from './apply-files.js';
import { renderArtifacts } from './render.js';

describe('loadFirstPartySkills', () => {
  it('returns the bundled imwel-extract skill as a skill artifact', async () => {
    const skills = await loadFirstPartySkills();
    const extract = skills.find((s) => s.sourcePath === 'imwel-extract');
    assert.ok(extract, 'expected imwel-extract to be bundled');
    assert.equal(extract!.type, 'skill');
    assert.ok(extract!.canonicalContent.includes('fingerprint'));
    assert.ok(extract!.bundleFiles?.some((f) => f.relativePath === 'SKILL.md'));
  });

  it('returns the bundled imwel-audit skill as a skill artifact', async () => {
    const skills = await loadFirstPartySkills();
    const audit = skills.find((s) => s.sourcePath === 'imwel-audit');
    assert.ok(audit, 'expected imwel-audit to be bundled');
    assert.equal(audit!.type, 'skill');
    assert.ok(audit!.bundleFiles?.some((f) => f.relativePath === 'SKILL.md'));
  });
});

describe('first-party skill install (render + isolation)', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-skill-'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('renders into selected tools and never registers a binding', async () => {
    const skills = await loadFirstPartySkills();
    const { files, conflicts } = renderArtifacts(skills, ['claude-code']);
    assert.equal(conflicts.length, 0);
    assert.ok(files.length > 0);

    await applyRenderedFiles(root, files);

    // Isolation: installing first-party skills must not create a binding.
    const binding = await readBinding(root);
    assert.equal(binding, null);
  });
});
