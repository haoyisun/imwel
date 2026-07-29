import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Binding } from './binding.js';
import type { PendingProposal } from './propose.js';
import {
  checkRemoteTargets,
  collectRemoteTargets,
  formatPassiveCheckWarnings,
  runPassiveCheckIfDue,
  shouldRunPassiveCheck,
  type RemoteCheckDependencies,
} from './passive-check.js';
import { setActiveLocale } from '../locales/index.js';

function binding(overrides: Partial<Binding> = {}): Binding {
  return {
    remote: 'origin',
    branch: 'main',
    projects: [{ name: 'app', mode: 'linked' }],
    tools: ['cursor'],
    lastSyncedCommit: 'binding-base',
    lastSyncedHistoryCommit: 'history',
    artifacts: [],
    ...overrides,
  };
}

function proposal(overrides: Partial<PendingProposal> = {}): PendingProposal {
  return {
    localPath: '.cursor/rules/example.mdc',
    sourceFiles: ['.cursor/rules/example.mdc'],
    sourceId: 'example',
    remote: 'origin',
    project: 'app',
    targetRole: 'project',
    type: 'rule',
    canonicalPath: 'rules/example.md',
    optional: false,
    tool: 'cursor',
    baseBranch: 'main',
    baseCommit: 'proposal-base',
    ...overrides,
  };
}

function dependencies(options: {
  binding?: Binding | null;
  proposals?: PendingProposal[];
  commits?: Record<string, string>;
  failRemote?: string;
} = {}): RemoteCheckDependencies & { fetches: string[]; reads: string[] } {
  const fetches: string[] = [];
  const reads: string[] = [];
  return {
    fetches,
    reads,
    readBinding: async () => options.binding ?? null,
    readProposals: async () => options.proposals ?? [],
    ensureRemoteCache: async (remote, cacheOptions) => {
      fetches.push(remote);
      cacheOptions.onFetch?.(remote);
      if (remote === options.failRemote) {
        throw new Error('offline');
      }
      return `/cache/${remote}`;
    },
    readRemoteCommit: async (_cacheDir, branch) => {
      reads.push(branch);
      const commit = options.commits?.[branch];
      if (!commit) {
        throw new Error(`missing ${branch}`);
      }
      return commit;
    },
  };
}

describe('remote target collection', () => {
  it('collects the current binding and proposal baselines', () => {
    const targets = collectRemoteTargets(binding(), [
      proposal(),
      proposal({ sourceId: 'legacy', baseBranch: undefined, baseCommit: undefined }),
    ]);

    assert.equal(targets.length, 3);
    assert.equal(targets[0]?.source, 'binding');
    assert.equal(targets[1]?.source, 'proposal');
    assert.equal(targets[2]?.baseCommit, undefined);
  });
});

describe('checkRemoteTargets', () => {
  it('does not fetch when the directory has no binding or proposals', async () => {
    const deps = dependencies();

    const results = await checkRemoteTargets('/project', {}, deps);

    assert.deepEqual(results, []);
    assert.deepEqual(deps.fetches, []);
  });

  it('fetches a shared remote once and reads each branch once', async () => {
    const deps = dependencies({
      binding: binding(),
      proposals: [
        proposal(),
        proposal({ sourceId: 'develop', baseBranch: 'develop', baseCommit: 'develop-base' }),
      ],
      commits: { main: 'remote-main', develop: 'remote-develop' },
    });

    const results = await checkRemoteTargets('/project', { force: false, throttleMs: 123 }, deps);

    assert.deepEqual(deps.fetches, ['origin']);
    assert.deepEqual(deps.reads.sort(), ['develop', 'main']);
    assert.equal(results.filter((result) => result.state === 'updated').length, 3);
  });

  it('compares only remote commits and marks legacy proposals unknown', async () => {
    const deps = dependencies({
      binding: binding(),
      proposals: [proposal({ baseBranch: undefined, baseCommit: undefined })],
      commits: { main: 'binding-base' },
    });

    const results = await checkRemoteTargets('/project', {}, deps);

    assert.equal(results[0]?.state, 'current');
    assert.equal(results[1]?.state, 'unknown');
  });

  it('returns failures without throwing or claiming an update', async () => {
    const deps = dependencies({
      binding: binding(),
      failRemote: 'origin',
    });

    const results = await checkRemoteTargets('/project', {}, deps);

    assert.equal(results[0]?.state, 'failed');
    assert.equal(results.some((result) => result.state === 'updated'), false);
  });
});

describe('passive warning output', () => {
  it('aggregates a shared target with short SHAs, sources, and next steps', () => {
    setActiveLocale('en');
    const targets = collectRemoteTargets(binding(), [proposal(), proposal({ sourceId: 'two' })]);
    const warnings = formatPassiveCheckWarnings(
      targets.map((target) => ({
        target,
        state: 'updated' as const,
        currentCommit: 'fedcba9876543210',
      })),
    );

    assert.match(warnings.join('\n'), /Remote template updates available/);
    assert.match(warnings.join('\n'), /origin\/main/);
    assert.match(warnings.join('\n'), /binding.*fedcba98/);
    assert.match(warnings.join('\n'), /binding.*proposals: 2/);
    assert.match(warnings.join('\n'), /imwel status.*imwel sync/);
  });

  it('localizes failure separately from update notices', () => {
    setActiveLocale('zh-CN');
    const [target] = collectRemoteTargets(binding(), []);
    const warnings = formatPassiveCheckWarnings([
      { target: target!, state: 'failed', error: 'offline' },
    ]);

    assert.match(warnings.join('\n'), /无法检查远程模板/);
    assert.match(warnings.join('\n'), /imwel status/);
    assert.doesNotMatch(warnings.join('\n'), /有更新/);
    setActiveLocale('en');
  });

  it('writes update warnings before the command action continues', async () => {
    setActiveLocale('en');
    const order: string[] = [];
    const originalWarn = console.warn;
    console.warn = () => order.push('warning');
    try {
      await runPassiveCheckIfDue(
        '/project',
        123,
        dependencies({
          binding: binding(),
          commits: { main: 'remote-commit' },
        }),
      );
      order.push('action');
    } finally {
      console.warn = originalWarn;
    }

    assert.equal(order.at(-1), 'action');
    assert.equal(order.slice(0, -1).every((item) => item === 'warning'), true);
    assert.equal(order.length > 1, true);
  });

  it('reports a due remote fetch before checking its commit', async () => {
    setActiveLocale('en');
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => output.push(args.map(String).join(' '));
    try {
      await runPassiveCheckIfDue(
        '/project',
        123,
        dependencies({
          binding: binding(),
          commits: { main: 'binding-base' },
        }),
      );
    } finally {
      console.log = originalLog;
    }

    assert.match(output.join('\n'), /Checking remote template "origin"/);
  });
});

describe('passive command boundaries', () => {
  it('skips commands that perform their own fresh remote check', () => {
    assert.equal(shouldRunPassiveCheck('sync'), false);
    assert.equal(shouldRunPassiveCheck('status'), false);
    assert.equal(shouldRunPassiveCheck('propose'), false);
    assert.equal(shouldRunPassiveCheck('doctor'), true);
  });
});
