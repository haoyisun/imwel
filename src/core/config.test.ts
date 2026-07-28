import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { addRemote, DuplicateRemoteUrlError, normalizeRemoteUrl } from './config.js';

describe('normalizeRemoteUrl', () => {
  it('strips a trailing .git and trailing slashes', () => {
    assert.equal(
      normalizeRemoteUrl('https://github.com/acme/standards.git/'),
      'https://github.com/acme/standards',
    );
  });

  it('lowercases the host in an https URL', () => {
    assert.equal(
      normalizeRemoteUrl('https://GitHub.com/acme/standards.git'),
      'https://github.com/acme/standards',
    );
  });

  it('lowercases the host in an scp-like URL', () => {
    assert.equal(
      normalizeRemoteUrl('git@GitHub.com:acme/standards.git'),
      'git@github.com:acme/standards',
    );
  });
});

describe('addRemote duplicate detection', () => {
  let home: string;
  let prevHome: string | undefined;

  beforeEach(async () => {
    home = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-config-'));
    prevHome = process.env.IMWEL_HOME;
    process.env.IMWEL_HOME = home;
  });

  afterEach(async () => {
    if (prevHome === undefined) delete process.env.IMWEL_HOME;
    else process.env.IMWEL_HOME = prevHome;
    await fs.rm(home, { recursive: true, force: true });
  });

  it('rejects an alias that already exists', async () => {
    await addRemote('org-standards', { url: 'https://github.com/acme/standards.git' });
    await assert.rejects(
      () => addRemote('org-standards', { url: 'https://github.com/acme/other.git' }),
      /already exists/,
    );
  });

  it('rejects the same URL registered under a different alias', async () => {
    await addRemote('org-standards', { url: 'https://github.com/acme/standards.git' });
    await assert.rejects(
      () => addRemote('mirror', { url: 'https://GitHub.com/acme/standards.git/' }),
      (error: unknown) => {
        assert.ok(error instanceof DuplicateRemoteUrlError);
        assert.equal(error.existingAlias, 'org-standards');
        return true;
      },
    );
  });

  it('allows distinct URLs under distinct aliases', async () => {
    await addRemote('org-standards', { url: 'https://github.com/acme/standards.git' });
    await addRemote('org-other', { url: 'https://github.com/acme/other.git' });
    // No throw — both registered.
  });
});
