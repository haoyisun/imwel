import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { RemoteCheckResult } from '../core/passive-check.js';
import { runStatus, type StatusDependencies } from './status.js';

const originalLog = console.log;
const originalWarn = console.warn;

afterEach(() => {
  console.log = originalLog;
  console.warn = originalWarn;
});

function proposalResult(state: RemoteCheckResult['state']): RemoteCheckResult {
  return {
    target: {
      source: 'proposal',
      remote: 'origin',
      branch: state === 'unknown' ? undefined : 'main',
      baseCommit: state === 'unknown' ? undefined : 'base123456',
      project: 'app',
    },
    state,
    ...(state === 'current' ? { currentCommit: 'base123456' } : {}),
  };
}

function dependencies(results: RemoteCheckResult[]): StatusDependencies {
  return {
    readBinding: async () => null,
    checkRemoteTargets: async () => results,
    listDirtyPaths: async () => [],
    reportRuleHealth: async () => undefined,
  };
}

describe('status remote targets', () => {
  it('succeeds and reports a proposal-only directory after a forced check', async () => {
    const output: string[] = [];
    console.log = (...args: unknown[]) => output.push(args.map(String).join(' '));

    const exitCode = await runStatus('/project', dependencies([proposalResult('current')]));

    assert.equal(exitCode, 0);
    assert.match(output.join('\n'), /Proposal.*origin\/main.*up to date/i);
  });

  it('reports a legacy proposal baseline as unknown with a refresh action', async () => {
    const output: string[] = [];
    console.log = (...args: unknown[]) => output.push(args.map(String).join(' '));

    const exitCode = await runStatus('/project', dependencies([proposalResult('unknown')]));

    assert.equal(exitCode, 0);
    assert.match(output.join('\n'), /cannot determine.*imwel propose/i);
  });
});
