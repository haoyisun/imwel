import * as p from '@clack/prompts';
import { getAdapter } from '../adapters/index.js';
import { readBinding } from '../core/binding.js';
import { error as outputError, info, success, warn } from '../core/cli-output.js';
import {
  CanonicalConflictError,
  collectEditCandidatesWithSkipped,
  collectProposalCandidatesWithSkipped,
  executePush,
  FromToolUnavailableError,
  type CollectedPushCandidates,
  type SkippedPushInput,
} from '../core/push.js';
import { exitIfMissingFlags, isInteractiveStdin } from '../core/cli-flags.js';
import {
  contributionSourceIdentity,
  markSuccessfulPushes,
  readPendingProposals,
  writePendingProposals,
} from '../core/propose.js';
import { getRemote } from '../core/config.js';
import { detectHostCli, createPullRequest } from '../core/host-cli.js';
import { t } from '../locales/index.js';

export interface PushOptions {
  yes?: boolean;
  all?: boolean;
  message?: string;
  from?: string;
}

function useNonInteractive(opts: PushOptions): boolean {
  return !isInteractiveStdin() || Boolean(opts.yes) || Boolean(opts.all) || Boolean(opts.message);
}

function printSkippedInputs(skipped: SkippedPushInput[]): void {
  if (skipped.length === 0) {
    return;
  }
  warn(t('push.skipped.title'), { target: 'stdout' });
  for (const item of skipped) {
    const key = item.kind === 'binding' ? 'push.skipped.bindingMissing' : 'push.skipped.proposalMissing';
    warn(
      t(key, {
        source: item.sourcePath,
        paths: item.missingPaths.join(', '),
      }),
      { target: 'stdout' },
    );
  }
}

function candidateId(candidate: {
  remote: string;
  project: string;
  canonicalPath: string;
}): string {
  return `${candidate.remote}\u0000${candidate.project}\u0000${candidate.canonicalPath}`;
}

async function collectEditsResolvingConflicts(
  projectDir: string,
  binding: NonNullable<Awaited<ReturnType<typeof readBinding>>>,
  proposals: Awaited<ReturnType<typeof readPendingProposals>>,
  opts: PushOptions,
  nonInteractive: boolean,
): Promise<CollectedPushCandidates | null> {
  let fromTool = opts.from;
  if (fromTool) {
    if (!binding.tools.includes(fromTool) || !getAdapter(fromTool)) {
      outputError(t('push.from.unknown', { tool: fromTool }));
      return null;
    }
  }

  for (;;) {
    try {
      return await collectEditCandidatesWithSkipped(projectDir, binding, proposals, {
        fromTool,
      });
    } catch (error) {
      if (error instanceof FromToolUnavailableError) {
        outputError(
          t('push.from.unavailable', {
            tool: error.tool,
            path: error.sourcePath,
          }),
        );
        return null;
      }
      if (!(error instanceof CanonicalConflictError)) {
        throw error;
      }
      if (nonInteractive) {
        outputError(
          t('push.canonicalConflict', {
            path: error.sourcePath,
            tools: error.tools.join(', '),
          }),
        );
        return null;
      }
      const selected = await p.select({
        message: t('push.canonicalConflict.pick', { path: error.sourcePath }),
        options: error.tools.map((tool) => ({ value: tool, label: tool })),
      });
      if (p.isCancel(selected)) {
        info(t('common.cancelled'));
        return null;
      }
      fromTool = String(selected);
    }
  }
}

export async function runPush(opts: PushOptions = {}): Promise<number> {
  p.intro(t('push.title'));
  const projectDir = process.cwd();
  const binding = await readBinding(projectDir);
  if (!binding) {
    outputError(t('push.noBinding'));
    return 1;
  }

  const spinner = p.spinner();
  spinner.start(t('push.fetching'));
  const proposals = await readPendingProposals(projectDir);
  const nonInteractive = useNonInteractive(opts);
  const editResult = await collectEditsResolvingConflicts(
    projectDir,
    binding,
    proposals,
    opts,
    nonInteractive,
  );
  if (!editResult) {
    spinner.stop(t('common.done'));
    return 1;
  }
  const proposalResult = await collectProposalCandidatesWithSkipped(projectDir, proposals);
  spinner.stop(t('common.done'));

  const skipped = [...editResult.skipped, ...proposalResult.skipped];
  printSkippedInputs(skipped);
  const missingTracking = skipped.filter(
    (item): item is SkippedPushInput & { trackingIdentity: string } =>
      item.kind === 'proposal' && Boolean(item.trackingIdentity),
  );
  const missingFailure = nonInteractive && missingTracking.length > 0;
  let nextProposals = proposals;
  if (missingTracking.length > 0) {
    if (nonInteractive) {
      outputError(t('push.missing.nonInteractive'));
    } else {
      const choice = await p.select({
        message: t('push.missing.prompt'),
        options: [
          { value: 'remove', label: t('push.missing.remove') },
          { value: 'cancel', label: t('push.missing.cancel') },
        ],
        initialValue: 'cancel',
      });
      if (p.isCancel(choice) || choice === 'cancel') {
        info(t('common.cancelled'));
        return 1;
      }
      const removed = new Set(missingTracking.map((item) => item.trackingIdentity));
      nextProposals = proposals.filter(
        (proposal) => !removed.has(contributionSourceIdentity(proposal)),
      );
      await writePendingProposals(projectDir, nextProposals);
    }
  }
  const all = [...editResult.candidates];
  const existingIds = new Set(all.map(candidateId));
  for (const candidate of proposalResult.candidates) {
    if (!existingIds.has(candidateId(candidate))) {
      all.push(candidate);
      existingIds.add(candidateId(candidate));
    }
  }
  if (all.length === 0) {
    info(t('push.noCandidates'));
    return missingFailure ? 1 : 0;
  }
  info(t('push.valid.title'));
  for (const candidate of all) {
    const accompanying = candidate.bundleFiles?.filter((f) => f.relativePath !== 'SKILL.md').length ?? 0;
    if (candidate.type === 'skill' && accompanying > 0) {
      info(t('push.valid.entrySkillBundle', { path: candidate.sourcePath, count: accompanying }));
    } else {
      info(t('push.valid.entry', { path: candidate.sourcePath }));
    }
    if (candidate.authoringTools && candidate.authoringTools.length > 0) {
      info(
        t('push.authoring', {
          path: candidate.sourcePath,
          tools: candidate.authoringTools.join(', '),
        }),
      );
    }
  }

  let selected: string[];
  let message: string;

  if (nonInteractive) {
    const missing = exitIfMissingFlags({
      '--all': opts.all ? 'all' : undefined,
      '--message': opts.message,
    });
    if (missing !== null) {
      return missing;
    }
    selected = all.map(candidateId);
    message = opts.message!;
    if (!opts.yes) {
      if (!isInteractiveStdin()) {
        outputError(t('cli.nonInteractiveConfirmRequired'));
        return 1;
      }
      const confirm = await p.confirm({
        message: t('push.confirm', { count: selected.length, skipped: skipped.length }),
        initialValue: true,
      });
      if (p.isCancel(confirm) || !confirm) {
        info(t('common.cancelled'));
        return 1;
      }
    }
  } else if (all.length === 1) {
    const only = all[0]!;
    selected = [candidateId(only)];
    const accompanying =
      only.bundleFiles?.filter((f) => f.relativePath !== 'SKILL.md').length ?? 0;
    const confirmMessage =
      only.type === 'skill' && accompanying > 0
        ? t('push.confirm.singleSkillBundle', {
            path: only.canonicalPath,
            count: accompanying,
          })
        : t('push.confirm.single', { path: only.canonicalPath });
    if (!opts.yes) {
      const confirm = await p.confirm({
        message: confirmMessage,
        initialValue: true,
      });
      if (p.isCancel(confirm) || !confirm) {
        info(t('common.cancelled'));
        return 1;
      }
    }
    const msg = await p.text({
      message: t('push.prompt.message'),
      defaultValue: 'chore: update imwel artifacts',
    });
    if (p.isCancel(msg)) {
      info(t('common.cancelled'));
      return 1;
    }
    message = String(msg);
  } else {
    const picked = (await p.multiselect({
      message: t('push.prompt.select'),
      options: all.map((candidate) => ({
        value: candidateId(candidate),
        label: `${candidate.canonicalPath} (${candidate.remote}/${candidate.project})`,
        hint:
          candidate.kind === 'module-contribution'
            ? t('push.moduleContribution')
            : undefined,
      })),
      required: true,
    })) as string[];
    if (p.isCancel(picked) || picked.length === 0) {
      info(t('common.cancelled'));
      return 1;
    }
    selected = picked;

    const msg = await p.text({
      message: t('push.prompt.message'),
      defaultValue: 'chore: update imwel artifacts',
    });
    if (p.isCancel(msg)) {
      info(t('common.cancelled'));
      return 1;
    }
    message = String(msg);

    if (!opts.yes) {
      const confirm = await p.confirm({
        message: t('push.confirm', { count: selected.length, skipped: skipped.length }),
        initialValue: true,
      });
      if (p.isCancel(confirm) || !confirm) {
        info(t('common.cancelled'));
        return 1;
      }
    }
  }

  const candidates = all.filter((candidate) => selected.includes(candidateId(candidate)));
  const groups = new Map<string, typeof candidates>();
  let failedGroup = false;
  for (const candidate of candidates) {
    const list = groups.get(candidate.remote) ?? [];
    list.push(candidate);
    groups.set(candidate.remote, list);
  }
  for (const [remoteAlias, group] of groups) {
    const remote = await getRemote(remoteAlias);
    if (!remote) {
      outputError(t('init.unknownRemote', { alias: remoteAlias }));
      failedGroup = true;
      continue;
    }
    const branch =
      remoteAlias === binding.remote ? binding.branch : (remote.defaultBranch ?? 'main');
    const result = await executePush({ ...binding, remote: remoteAlias, branch }, group, message);
    const successfulTracking = new Set(
      group
        .map((candidate) => candidate.trackingIdentity)
        .filter((identity): identity is string => Boolean(identity)),
    );
    nextProposals = markSuccessfulPushes(nextProposals, successfulTracking, {
      branch: result.branch,
      commit: result.commit,
      baseBranch: result.baseBranch,
      baseCommit: result.baseCommit,
    });
    await writePendingProposals(projectDir, nextProposals);
    if (result.directPush) {
      success(t('push.directPush', { branch: result.branch }));
    } else {
      success(t('push.success', { branch: result.branch }));
      info(t('push.compareUrl', { url: result.compareUrl }));
      if (!nonInteractive) {
        const hostCli = await detectHostCli();
        if (hostCli) {
          const createPr = await p.confirm({
            message: t('push.prompt.pr', { cli: hostCli }),
            initialValue: false,
          });
          if (!p.isCancel(createPr) && createPr) {
            const prUrl = await createPullRequest(
              hostCli,
              message,
              'imwel artifact updates',
              branch,
              result.branch,
            );
            if (prUrl) {
              success(t('push.prCreated', { url: prUrl }));
            }
          }
        }
      }
    }
  }
  p.outro(t('common.done'));
  return missingFailure || failedGroup ? 1 : 0;
}
