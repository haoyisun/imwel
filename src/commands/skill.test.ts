import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readBinding, writeBinding, type Binding } from '../core/binding.js';
import { setActiveLocale } from '../locales/index.js';
import {
  installCommandPackWithFeedback,
  selectSkillInstallTools,
  type SkillToolPrompts,
} from './skill.js';

function fixtureBinding(tools: string[]): Binding {
  return {
    remote: 'origin',
    branch: 'main',
    projects: [{ name: 'app', mode: 'linked' }],
    tools,
    lastSyncedCommit: 'remote-commit',
    lastSyncedHistoryCommit: 'history-commit',
    artifacts: [],
  };
}

describe('skill install tool selection', () => {
  let projectDir: string;

  beforeEach(async () => {
    setActiveLocale('en');
    projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-skill-select-'));
  });

  afterEach(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
  });

  it('reuses valid binding tools by default without opening the multiselect or changing binding', async () => {
    const binding = fixtureBinding(['cursor', 'claude-code']);
    await writeBinding(projectDir, binding);
    let confirmOptions: Parameters<SkillToolPrompts['confirm']>[0] | undefined;
    const prompts: SkillToolPrompts = {
      confirm: async (options) => {
        confirmOptions = options;
        return true;
      },
      multiselect: async () => {
        throw new Error('multiselect should not be called');
      },
    };

    const selected = await selectSkillInstallTools(projectDir, binding, prompts);

    assert.deepEqual(selected, ['cursor', 'claude-code']);
    assert.equal(confirmOptions?.initialValue, true);
    assert.match(confirmOptions?.message ?? '', /cursor, claude-code/);
    assert.deepEqual((await readBinding(projectDir))?.tools, ['cursor', 'claude-code']);
  });

  it('opens the multiselect with valid binding tools preselected when reuse is declined', async () => {
    const binding = fixtureBinding(['cursor', 'claude-code']);
    let multiselectOptions: Parameters<SkillToolPrompts['multiselect']>[0] | undefined;
    const prompts: SkillToolPrompts = {
      confirm: async () => false,
      multiselect: async (options) => {
        multiselectOptions = options;
        return ['claude-code'];
      },
    };

    const selected = await selectSkillInstallTools(projectDir, binding, prompts);

    assert.deepEqual(selected, ['claude-code']);
    assert.deepEqual(multiselectOptions?.initialValues, ['cursor', 'claude-code']);
  });

  it('falls back directly to the multiselect when binding tools are empty', async () => {
    const binding = fixtureBinding([]);
    let confirmCalled = false;
    let multiselectOptions: Parameters<SkillToolPrompts['multiselect']>[0] | undefined;
    const prompts: SkillToolPrompts = {
      confirm: async () => {
        confirmCalled = true;
        return true;
      },
      multiselect: async (options) => {
        multiselectOptions = options;
        return ['cursor'];
      },
    };

    const selected = await selectSkillInstallTools(projectDir, binding, prompts);

    assert.deepEqual(selected, ['cursor']);
    assert.equal(confirmCalled, false);
    assert.deepEqual(multiselectOptions?.initialValues, []);
  });

  it('warns and falls back directly to the multiselect with only valid binding tools preselected', async () => {
    const binding = fixtureBinding(['cursor', 'retired-tool']);
    let confirmCalled = false;
    let multiselectOptions: Parameters<SkillToolPrompts['multiselect']>[0] | undefined;
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (message?: unknown) => warnings.push(String(message));
    const prompts: SkillToolPrompts = {
      confirm: async () => {
        confirmCalled = true;
        return true;
      },
      multiselect: async (options) => {
        multiselectOptions = options;
        return ['cursor'];
      },
    };

    try {
      const selected = await selectSkillInstallTools(projectDir, binding, prompts);
      assert.deepEqual(selected, ['cursor']);
    } finally {
      console.warn = originalWarn;
    }

    assert.equal(confirmCalled, false);
    assert.deepEqual(multiselectOptions?.initialValues, ['cursor']);
    assert.ok(warnings.some((message) => message.includes('retired-tool')));
  });

  it('warns and falls back with no preselection when all binding tools are unsupported', async () => {
    const binding = fixtureBinding(['retired-tool']);
    let multiselectOptions: Parameters<SkillToolPrompts['multiselect']>[0] | undefined;
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (message?: unknown) => warnings.push(String(message));
    const prompts: SkillToolPrompts = {
      confirm: async () => {
        throw new Error('confirm should not be called');
      },
      multiselect: async (options) => {
        multiselectOptions = options;
        return ['cursor'];
      },
    };

    try {
      const selected = await selectSkillInstallTools(projectDir, binding, prompts);
      assert.deepEqual(selected, ['cursor']);
    } finally {
      console.warn = originalWarn;
    }

    assert.deepEqual(multiselectOptions?.initialValues, []);
    assert.ok(warnings.some((message) => message.includes('retired-tool')));
  });

  it('keeps the original multiselect behavior when no binding exists', async () => {
    let confirmCalled = false;
    let multiselectOptions: Parameters<SkillToolPrompts['multiselect']>[0] | undefined;
    const prompts: SkillToolPrompts = {
      confirm: async () => {
        confirmCalled = true;
        return true;
      },
      multiselect: async (options) => {
        multiselectOptions = options;
        return ['cursor'];
      },
    };

    const selected = await selectSkillInstallTools(projectDir, null, prompts);

    assert.deepEqual(selected, ['cursor']);
    assert.equal(confirmCalled, false);
    assert.equal(multiselectOptions?.initialValues, undefined);
  });

  it('never writes command-pack tool choices back to the binding', async () => {
    await writeBinding(projectDir, fixtureBinding(['claude-code']));

    const code = await installCommandPackWithFeedback(projectDir, ['cursor'], {
      yes: true,
      confirm: false,
    });

    assert.equal(code, 0);
    assert.deepEqual((await readBinding(projectDir))?.tools, ['claude-code']);
  });
});
