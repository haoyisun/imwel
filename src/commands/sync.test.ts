import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Binding } from '../core/binding.js';
import {
  applyInteractiveModuleDrift,
  authorizeSyncChanges,
  planInteractiveModuleDrift,
  promptModuleDriftChoice,
  runGuidedSyncOrchestration,
  runSyncInteractionMode,
} from './sync.js';
import { promptFinalWriteAction } from './write-safety.js';

function bindingWithEditedModule(): Binding {
  return {
    remote: 'team',
    branch: 'main',
    projects: [{ name: 'shared-rules', mode: 'subscribed' }],
    tools: ['cursor'],
    lastSyncedCommit: 'remote-before',
    lastSyncedHistoryCommit: 'history-before',
    artifacts: [
      {
        project: 'shared-rules',
        sourcePath: 'rules/shared.md',
        type: 'rule',
        optional: false,
        localEdit: false,
        installedPaths: { cursor: ['AGENTS.md'] },
      },
    ],
  };
}

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

describe('sync interactive selections', () => {
  it('runs guided sync without back when the prepared round has no selections', async () => {
    const allowBackValues: boolean[] = [];
    let applyDriftCalls = 0;
    let writeResultsCalls = 0;
    let writeBindingCalls = 0;

    const result = await runGuidedSyncOrchestration({
      prepare: async () => ({
        prepared: 'remote-only',
        choices: new Map(),
        selectionCount: 0,
      }),
      prompt: async (_prepared, allowBack) => {
        allowBackValues.push(allowBack);
        return 'cancel';
      },
      apply: async () => {
        applyDriftCalls += 1;
        writeResultsCalls += 1;
        writeBindingCalls += 1;
        return 0;
      },
    });

    assert.deepEqual(allowBackValues, [false]);
    assert.equal(result.status, 'cancelled');
    assert.equal(applyDriftCalls, 0);
    assert.equal(writeResultsCalls, 0);
    assert.equal(writeBindingCalls, 0);
  });

  it('replans with prior choices after back and applies only after confirmation', async () => {
    const retainedChoices = new Map([['shared-rules', 'discard' as const]]);
    const receivedPriorChoices: Array<Map<string, string>> = [];
    const actions = ['back', 'apply'] as const;
    let promptIndex = 0;
    let applyDriftCalls = 0;
    let writeResultsCalls = 0;
    let writeBindingCalls = 0;

    const result = await runGuidedSyncOrchestration({
      prepare: async (priorChoices) => {
        receivedPriorChoices.push(new Map(priorChoices));
        return {
          prepared: `round-${receivedPriorChoices.length}`,
          choices: retainedChoices,
          selectionCount: 1,
        };
      },
      prompt: async (_prepared, allowBack) => {
        assert.equal(allowBack, true);
        return actions[promptIndex++]!;
      },
      apply: async (prepared) => {
        applyDriftCalls += 1;
        writeResultsCalls += 1;
        writeBindingCalls += 1;
        assert.equal(prepared, 'round-2');
        return 0;
      },
    });

    assert.deepEqual([...receivedPriorChoices[0]!.entries()], []);
    assert.deepEqual([...receivedPriorChoices[1]!.entries()], [...retainedChoices.entries()]);
    assert.equal(applyDriftCalls, 1);
    assert.equal(writeResultsCalls, 1);
    assert.equal(writeBindingCalls, 1);
    assert.deepEqual(result, { status: 'applied', result: 0 });
  });

  it('does not enter the guided final selector for non-interactive authorization', async () => {
    let finalSelectCalls = 0;

    const result = await runSyncInteractionMode(
      false,
      async () => {
        finalSelectCalls += 1;
        return 'guided';
      },
      async () => 'non-interactive',
    );

    assert.equal(result, 'non-interactive');
    assert.equal(finalSelectCalls, 0);
  });

  it('omits back when there are no module drift choices to revisit', async () => {
    let offered: string[] = [];

    const action = await promptFinalWriteAction(
      'Apply sync?',
      async (options) => {
        offered = options.options.map((option) => option.value);
        return 'cancel';
      },
      false,
    );

    assert.deepEqual(offered, ['apply', 'cancel']);
    assert.equal(action, 'cancel');
  });

  it('uses the prior module drift choice as the initial value after going back', async () => {
    let receivedInitialValue: string | undefined;

    const choice = await promptModuleDriftChoice(
      'shared-rules',
      ['AGENTS.md'],
      'discard',
      async (options) => {
        receivedInitialValue = options.initialValue;
        return 'freeze';
      },
    );

    assert.equal(receivedInitialValue, 'discard');
    assert.equal(choice, 'freeze');
  });

  it('preserves cancel as a distinct choice before any sync writes', async () => {
    const choice = await promptModuleDriftChoice(
      'shared-rules',
      ['AGENTS.md'],
      'freeze',
      async () => 'cancel',
    );

    assert.equal(choice, 'cancel');
  });

  it('plans destructive module drift without applying it before final confirmation', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-sync-confirm-'));
    const editedPath = path.join(projectDir, 'AGENTS.md');
    await fs.writeFile(editedPath, 'local edit', 'utf8');

    try {
      const plan = await planInteractiveModuleDrift(
        bindingWithEditedModule(),
        ['AGENTS.md'],
        new Map(),
        async () => 'discard',
      );

      assert.ok(plan);
      assert.equal(await fs.readFile(editedPath, 'utf8'), 'local edit');

      await applyInteractiveModuleDrift(projectDir, plan);
      await assert.rejects(fs.access(editedPath));
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });

  it('cancels module drift planning without changing files', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imwel-sync-cancel-'));
    const editedPath = path.join(projectDir, 'AGENTS.md');
    await fs.writeFile(editedPath, 'local edit', 'utf8');

    try {
      const plan = await planInteractiveModuleDrift(
        bindingWithEditedModule(),
        ['AGENTS.md'],
        new Map(),
        async () => 'cancel',
      );

      assert.equal(plan, null);
      assert.equal(await fs.readFile(editedPath, 'utf8'), 'local edit');
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });
});
