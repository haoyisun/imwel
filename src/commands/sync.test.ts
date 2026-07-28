import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { authorizeSyncChanges } from './sync.js';

describe('authorizeSyncChanges', () => {
  it('rejects an interactive restoration when the user declines', async () => {
    assert.equal(await authorizeSyncChanges(false, true, async () => false), false);
  });

  it('rejects non-interactive restoration without --yes', async () => {
    let prompted = false;
    const authorized = await authorizeSyncChanges(false, false, async () => {
      prompted = true;
      return true;
    });

    assert.equal(authorized, false);
    assert.equal(prompted, false);
  });

  it('accepts non-interactive restoration with --yes', async () => {
    assert.equal(await authorizeSyncChanges(true, false, async () => false), true);
  });
});
