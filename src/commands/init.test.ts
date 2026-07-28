import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initPromptInitialValues, runInitFinalOrchestration } from './init.js';
import { promptFinalWriteAction } from './write-safety.js';

describe('init final confirmation', () => {
  it('does not call file or binding writes after final cancel', async () => {
    let applyInspectedCalls = 0;
    let writeBindingCalls = 0;

    const result = await runInitFinalOrchestration({
      prompt: async () => 'cancel',
      reenterToolSelection: async () => {
        assert.fail('cancel must not re-enter tool selection');
      },
      apply: async () => {
        applyInspectedCalls += 1;
        writeBindingCalls += 1;
      },
    });

    assert.equal(result.status, 'cancelled');
    assert.equal(applyInspectedCalls, 0);
    assert.equal(writeBindingCalls, 0);
  });

  it('re-enters tool selection on back and applies only on a later confirmation', async () => {
    const actions = ['back', 'apply'] as const;
    let promptIndex = 0;
    let toolSelectionCalls = 1;
    let applyInspectedCalls = 0;
    let writeBindingCalls = 0;

    const first = await runInitFinalOrchestration({
      prompt: async () => actions[promptIndex++]!,
      reenterToolSelection: async () => {
        toolSelectionCalls += 1;
      },
      apply: async () => {
        applyInspectedCalls += 1;
        writeBindingCalls += 1;
      },
    });
    const second = await runInitFinalOrchestration({
      prompt: async () => actions[promptIndex++]!,
      reenterToolSelection: async () => {
        toolSelectionCalls += 1;
      },
      apply: async () => {
        applyInspectedCalls += 1;
        writeBindingCalls += 1;
      },
    });

    assert.equal(first.status, 'back');
    assert.equal(second.status, 'applied');
    assert.equal(toolSelectionCalls, 2);
    assert.equal(applyInspectedCalls, 1);
    assert.equal(writeBindingCalls, 1);
  });

  it('offers apply, back, and cancel with apply selected initially', async () => {
    let received: {
      options: Array<{ value: string }>;
      initialValue?: string;
    } | undefined;

    const action = await promptFinalWriteAction('Apply files?', async (options) => {
      received = options;
      return 'back';
    });

    assert.equal(action, 'back');
    assert.deepEqual(received?.options.map((option) => option.value), [
      'apply',
      'back',
      'cancel',
    ]);
    assert.equal(received?.initialValue, 'apply');
  });

  it('preserves every prior selection when returning to the first prompt', () => {
    const initial = initPromptInitialValues(
      {
        tools: ['cursor', 'claude-code'],
        remote: 'team',
        branch: 'release',
        modules: ['shared-rules'],
        writableProject: undefined,
        optionalArtifacts: ['shared-rules\u0000optional.md'],
      },
      true,
      {
        tools: ['cursor'],
        remote: 'origin',
        branch: 'main',
        modules: ['legacy'],
        writableProject: 'app',
      },
    );

    assert.deepEqual(initial, {
      tools: ['cursor', 'claude-code'],
      remote: 'team',
      branch: 'release',
      modules: ['shared-rules'],
      writableProject: undefined,
      optionalArtifacts: ['shared-rules\u0000optional.md'],
    });
  });

  it('maps an explicit cancel selection to a no-write action', async () => {
    const action = await promptFinalWriteAction('Apply files?', async () => 'cancel');
    assert.equal(action, 'cancel');
  });
});
