import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_FETCH_THROTTLE_MS,
  resolveFetchThrottleMs,
} from './throttle.js';

describe('resolveFetchThrottleMs', () => {
  it('uses a two-hour default interval', () => {
    assert.equal(DEFAULT_FETCH_THROTTLE_MS, 2 * 60 * 60 * 1000);
  });

  it('returns default when unset', () => {
    assert.equal(resolveFetchThrottleMs({}), DEFAULT_FETCH_THROTTLE_MS);
  });

  it('returns default when empty', () => {
    assert.equal(
      resolveFetchThrottleMs({ IMWEL_FETCH_THROTTLE_MS: '' }),
      DEFAULT_FETCH_THROTTLE_MS,
    );
  });

  it('accepts a positive finite number', () => {
    assert.equal(resolveFetchThrottleMs({ IMWEL_FETCH_THROTTLE_MS: '60000' }), 60000);
  });

  it('falls back on non-positive or invalid values', () => {
    assert.equal(
      resolveFetchThrottleMs({ IMWEL_FETCH_THROTTLE_MS: '0' }),
      DEFAULT_FETCH_THROTTLE_MS,
    );
    assert.equal(
      resolveFetchThrottleMs({ IMWEL_FETCH_THROTTLE_MS: '-1' }),
      DEFAULT_FETCH_THROTTLE_MS,
    );
    assert.equal(
      resolveFetchThrottleMs({ IMWEL_FETCH_THROTTLE_MS: 'nope' }),
      DEFAULT_FETCH_THROTTLE_MS,
    );
  });
});
