import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  installCommandPack,
  planCommandPack,
  removeStaleThinCommands,
} from './command-pack.js';
import { pathExists } from './fs-utils.js';

describe('command pack (skill-only)', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-cmdpack-'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('plans skills into tool skill dirs and never emits .cursor/commands files', async () => {
    const plan = await planCommandPack(['cursor', 'claude-code']);
    assert.ok(plan.skills.length >= 4);
    assert.ok(plan.files.some((f) => f.path.startsWith('.cursor/skills/imwel-')));
    assert.ok(plan.files.some((f) => f.path.startsWith('.claude/skills/imwel-')));
    assert.equal(
      plan.files.some((f) => f.path.includes('/commands/')),
      false,
      'command pack must not write thin slash-command files',
    );
  });

  it('removes legacy thin commands for pack members but keeps author scaffold commands', async () => {
    const commandsDir = path.join(root, '.cursor', 'commands');
    await fs.mkdir(commandsDir, { recursive: true });
    await fs.writeFile(
      path.join(commandsDir, 'imwel-adopt.md'),
      '---\ngeneratedBy: imwel\n---\n# /imwel-adopt\n',
      'utf8',
    );
    await fs.writeFile(
      path.join(commandsDir, 'imwel-author.md'),
      '---\ngeneratedBy: imwel\n---\n# /imwel-author\n',
      'utf8',
    );

    const plan = await planCommandPack(['cursor']);
    const removed = await removeStaleThinCommands(root, plan);

    assert.deepEqual(removed, ['.cursor/commands/imwel-adopt.md']);
    assert.equal(await pathExists(path.join(commandsDir, 'imwel-adopt.md')), false);
    assert.equal(await pathExists(path.join(commandsDir, 'imwel-author.md')), true);
  });

  it('install writes skills and cleans stale thin commands', async () => {
    const commandsDir = path.join(root, '.cursor', 'commands');
    await fs.mkdir(commandsDir, { recursive: true });
    await fs.writeFile(
      path.join(commandsDir, 'imwel-extract.md'),
      '---\ngeneratedBy: imwel\n---\n# /imwel-extract\n',
      'utf8',
    );

    const plan = await planCommandPack(['cursor']);
    const { written, removed } = await installCommandPack(root, plan);

    assert.ok(written.some((p) => p.includes('.cursor/skills/imwel-extract/')));
    assert.deepEqual(removed, ['.cursor/commands/imwel-extract.md']);
    assert.equal(await pathExists(path.join(root, '.cursor', 'skills', 'imwel-extract', 'SKILL.md')), true);
    assert.equal(await pathExists(path.join(commandsDir, 'imwel-extract.md')), false);
  });
});
