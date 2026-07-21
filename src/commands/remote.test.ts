import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { resolveRemoteAddArgs } from './remote.js';

const URL = 'https://github.com/acme/standards.git';

describe('resolveRemoteAddArgs', () => {
  let home: string;
  let prevHome: string | undefined;

  beforeEach(async () => {
    home = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-remote-'));
    prevHome = process.env.IMWEL_HOME;
    process.env.IMWEL_HOME = home;
  });

  afterEach(async () => {
    if (prevHome === undefined) delete process.env.IMWEL_HOME;
    else process.env.IMWEL_HOME = prevHome;
    await fs.rm(home, { recursive: true, force: true });
  });

  it('keeps the backward-compatible alias-first two-arg form', async () => {
    const result = await resolveRemoteAddArgs({ urlOrAlias: 'org-standards', url: URL });
    assert.deepEqual(result, { alias: 'org-standards', url: URL });
  });

  it('derives the alias from a single URL argument', async () => {
    const result = await resolveRemoteAddArgs({ urlOrAlias: URL });
    assert.deepEqual(result, { alias: 'standards', url: URL });
  });

  it('honors an explicit --as override with a single URL', async () => {
    const result = await resolveRemoteAddArgs({ urlOrAlias: URL, as: 'my-alias' });
    assert.deepEqual(result, { alias: 'my-alias', url: URL });
  });

  it('rejects a single non-URL argument with actionable guidance', async () => {
    const result = await resolveRemoteAddArgs({ urlOrAlias: 'just-an-alias' });
    assert.ok('error' in result);
  });
});
