import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateManifest, projectRole, ManifestError } from './manifest.js';

describe('manifest role', () => {
  it('parses shared/project roles and defaults missing role to project', () => {
    const manifest = validateManifest({
      projects: [
        { name: 'python-std', path: 'modules/python', role: 'shared' },
        { name: 'app', path: 'projects/app', role: 'project' },
        { name: 'legacy', path: 'projects/legacy' },
      ],
    } as never);
    assert.equal(projectRole(manifest.projects[0]!), 'shared');
    assert.equal(projectRole(manifest.projects[1]!), 'project');
    assert.equal(projectRole(manifest.projects[2]!), 'project');
  });

  it('rejects an invalid role value', () => {
    assert.throws(
      () =>
        validateManifest({
          projects: [{ name: 'x', path: 'x', role: 'library' }],
        } as never),
      ManifestError,
    );
  });
});
