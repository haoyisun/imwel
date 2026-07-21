import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deriveRemoteAlias, looksLikeUrl } from './remote-alias.js';

describe('looksLikeUrl', () => {
  it('treats scheme, scp, and path forms as URLs', () => {
    assert.equal(looksLikeUrl('https://github.com/acme/standards.git'), true);
    assert.equal(looksLikeUrl('git@github.com:acme/standards.git'), true);
    assert.equal(looksLikeUrl('ssh://git@host/acme/standards'), true);
  });

  it('treats a bare token as an alias', () => {
    assert.equal(looksLikeUrl('org-standards'), false);
    assert.equal(looksLikeUrl('templates'), false);
  });
});

describe('deriveRemoteAlias', () => {
  it('derives the repo name from https and scp URLs', () => {
    assert.equal(deriveRemoteAlias('https://github.com/acme/standards.git', []), 'standards');
    assert.equal(deriveRemoteAlias('git@github.com:acme/standards.git', []), 'standards');
  });

  it('falls back to owner-repo on collision, then a numeric suffix', () => {
    assert.equal(
      deriveRemoteAlias('https://github.com/acme/standards.git', ['standards']),
      'acme-standards',
    );
    assert.equal(
      deriveRemoteAlias('https://github.com/acme/standards.git', ['standards', 'acme-standards']),
      'standards-2',
    );
  });

  it('slugifies non-alphanumeric characters', () => {
    assert.equal(deriveRemoteAlias('https://example.com/team/My_Rules.Repo.git', []), 'my-rules-repo');
  });
});
