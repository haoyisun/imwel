import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Adapter } from '../adapters/types.js';
import type { Binding } from '../core/binding.js';
import type { Manifest } from '../core/manifest.js';
import type { PendingProposal } from '../core/propose.js';
import type { ProposeCandidateSummary } from '../core/propose-candidates.js';
import {
  prepareProposeProjectSelection,
  shouldFastFailPropose,
  type ProposePreflightDependencies,
} from './propose.js';

const manifest: Manifest = {
  conventions: { rulesDir: 'rules', skillsDir: 'skills', agentsFile: 'agents.md' },
  projects: [
    { name: 'app', path: 'projects/app' },
    { name: 'shared', path: 'projects/shared', role: 'shared' },
  ],
};

function emptySummary(candidateCount = 0): ProposeCandidateSummary {
  return {
    candidates: Array.from({ length: candidateCount }, (_, index) => ({
      path: `.cursor/rules/rule-${index}.mdc`,
      sourceFiles: [`.cursor/rules/rule-${index}.mdc`],
      sourceId: `rule-${index}`,
      type: 'rule',
      tool: 'test',
      tracked: false,
      canonicalPath: `rules/rule-${index}.md`,
      canonicalContent: `Rule ${index}`,
      optional: false,
      status: 'clean',
    })),
    conflicts: [],
    excluded: { provenance: 0, linkedBinding: 0, otherTarget: 0, conflict: 0 },
  };
}

function pending(project: string, remote = 'origin'): PendingProposal {
  return {
    localPath: '.cursor/rules/example.mdc',
    sourceFiles: ['.cursor/rules/example.mdc'],
    sourceId: 'example',
    remote,
    project,
    targetRole: 'project',
    type: 'rule',
    canonicalPath: 'rules/example.md',
    optional: false,
    tool: 'test',
  };
}

function preflightDependencies(options: {
  proposals?: PendingProposal[];
  candidateProjects?: string[];
  onProjectPrompt?: () => void;
  adapter?: Adapter;
} = {}): ProposePreflightDependencies {
  return {
    adapterList: options.adapter ? [options.adapter] : [],
    readBinding: async (): Promise<Binding | null> => null,
    readProposals: async () => options.proposals ?? [],
    collectCandidates: async (_projectDir, _adapters, _binding, _proposals, target) =>
      emptySummary(options.candidateProjects?.includes(target.project.name) ? 1 : 0),
    selectProject: async () => {
      options.onProjectPrompt?.();
      return 'app';
    },
  };
}

describe('propose interactive preflight', () => {
  it('fast-fails when every project has no candidates and the remote has no pending proposals', () => {
    assert.equal(
      shouldFastFailPropose({
        filePath: undefined,
        nonInteractive: false,
        candidateCounts: [0, 0],
        hasPendingForRemote: false,
      }),
      true,
    );
  });

  it('keeps project selection when the remote has a pending proposal', () => {
    assert.equal(
      shouldFastFailPropose({
        filePath: undefined,
        nonInteractive: false,
        candidateCounts: [0, 0],
        hasPendingForRemote: true,
      }),
      false,
    );
  });

  it('keeps project selection when any project has a candidate', () => {
    assert.equal(
      shouldFastFailPropose({
        filePath: undefined,
        nonInteractive: false,
        candidateCounts: [0, 1],
        hasPendingForRemote: false,
      }),
      false,
    );
  });

  it('does not fast-fail file or non-interactive flows', () => {
    assert.equal(
      shouldFastFailPropose({
        filePath: 'rules/example.md',
        nonInteractive: false,
        candidateCounts: [0],
        hasPendingForRemote: false,
      }),
      false,
    );
    assert.equal(
      shouldFastFailPropose({
        filePath: undefined,
        nonInteractive: true,
        candidateCounts: [0],
        hasPendingForRemote: false,
      }),
      false,
    );
  });

  it('fast-fails without prompting for a project when every manifest project is empty', async () => {
    let projectPrompts = 0;

    const result = await prepareProposeProjectSelection(
      {
        projectDir: '/project',
        cacheDir: '/cache',
        remote: 'origin',
        manifest,
        filePath: undefined,
        nonInteractive: false,
      },
      preflightDependencies({ onProjectPrompt: () => projectPrompts += 1 }),
    );

    assert.equal(result.fastFailed, true);
    assert.equal(result.selectedProject, undefined);
    assert.equal(projectPrompts, 0);
  });

  it('ignores stale pending projects when deciding whether to fast-fail', async () => {
    let projectPrompts = 0;

    const result = await prepareProposeProjectSelection(
      {
        projectDir: '/project',
        cacheDir: '/cache',
        remote: 'origin',
        manifest,
        filePath: undefined,
        nonInteractive: false,
      },
      preflightDependencies({
        proposals: [pending('renamed-project')],
        onProjectPrompt: () => projectPrompts += 1,
      }),
    );

    assert.equal(result.fastFailed, true);
    assert.equal(projectPrompts, 0);
  });

  it('prompts for a project when a current manifest project has pending tracking', async () => {
    let projectPrompts = 0;

    const result = await prepareProposeProjectSelection(
      {
        projectDir: '/project',
        cacheDir: '/cache',
        remote: 'origin',
        manifest,
        filePath: undefined,
        nonInteractive: false,
      },
      preflightDependencies({
        proposals: [pending('shared')],
        onProjectPrompt: () => projectPrompts += 1,
      }),
    );

    assert.equal(result.fastFailed, false);
    assert.equal(result.selectedProject, 'app');
    assert.equal(projectPrompts, 1);
  });

  it('prompts for a project and reuses one discovery per adapter when candidates exist', async () => {
    let discoverCalls = 0;
    let projectPrompts = 0;
    const adapter: Adapter = {
      id: 'test',
      detect: async () => true,
      render: () => [],
      parseExisting: () => ({ canonicalContent: '' }),
      discoverExisting: async () => {
        discoverCalls += 1;
        return [];
      },
    };

    const result = await prepareProposeProjectSelection(
      {
        projectDir: '/project',
        cacheDir: '/cache',
        remote: 'origin',
        manifest,
        filePath: undefined,
        nonInteractive: false,
      },
      preflightDependencies({
        adapter,
        candidateProjects: ['shared'],
        onProjectPrompt: () => projectPrompts += 1,
      }),
    );

    assert.equal(result.fastFailed, false);
    assert.equal(projectPrompts, 1);
    assert.equal(discoverCalls, 1);
  });

  it('does not enter preflight for file or non-interactive flows', async () => {
    let dependencyCalls = 0;
    const dependencies = preflightDependencies();
    dependencies.readBinding = async () => {
      dependencyCalls += 1;
      return null;
    };
    dependencies.readProposals = async () => {
      dependencyCalls += 1;
      return [];
    };
    dependencies.selectProject = async () => {
      dependencyCalls += 1;
      return 'app';
    };

    const fileResult = await prepareProposeProjectSelection(
      {
        projectDir: '/project',
        cacheDir: '/cache',
        remote: 'origin',
        manifest,
        filePath: 'rules/example.md',
        nonInteractive: false,
      },
      dependencies,
    );
    const nonInteractiveResult = await prepareProposeProjectSelection(
      {
        projectDir: '/project',
        cacheDir: '/cache',
        remote: 'origin',
        manifest,
        filePath: undefined,
        nonInteractive: true,
      },
      dependencies,
    );

    assert.equal(fileResult.fastFailed, false);
    assert.equal(nonInteractiveResult.fastFailed, false);
    assert.equal(dependencyCalls, 0);
  });
});
