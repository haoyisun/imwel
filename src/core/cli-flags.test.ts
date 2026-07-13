import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { collectMissingFlags, parseCsv } from './cli-flags.js';

describe('collectMissingFlags', () => {
  it('lists flags with undefined or empty values', () => {
    assert.deepEqual(
      collectMissingFlags({
        '--tools': 'cursor',
        '--remote': undefined,
        '--branch': '',
        '--project': 'app',
      }),
      ['--remote', '--branch'],
    );
  });

  it('treats boolean false as present', () => {
    assert.deepEqual(collectMissingFlags({ '--no-optional': false }), []);
  });
});

describe('parseCsv', () => {
  it('splits and trims', () => {
    assert.deepEqual(parseCsv('cursor, claude-code'), ['cursor', 'claude-code']);
  });

  it('returns empty for blank input', () => {
    assert.deepEqual(parseCsv(undefined), []);
    assert.deepEqual(parseCsv('  '), []);
  });
});
