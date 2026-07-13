import * as p from '@clack/prompts';
import { readBinding } from '../core/binding.js';
import {
  CanonicalConflictError,
  collectEditCandidates,
  collectProposalCandidates,
  executePush,
} from '../core/push.js';
import { exitIfMissingFlags, isInteractiveStdin } from '../core/cli-flags.js';
import { readPendingProposals, clearPendingProposals } from '../core/propose.js';
import { detectHostCli, createPullRequest } from '../core/host-cli.js';
import { t } from '../locales/index.js';

export interface PushOptions {
  yes?: boolean;
  all?: boolean;
  message?: string;
}

function useNonInteractive(opts: PushOptions): boolean {
  return !isInteractiveStdin() || Boolean(opts.yes) || Boolean(opts.all) || Boolean(opts.message);
}

export async function runPush(opts: PushOptions = {}): Promise<number> {
  p.intro(t('push.title'));
  const projectDir = process.cwd();
  const binding = await readBinding(projectDir);
  if (!binding) {
    console.error(t('push.noBinding'));
    return 1;
  }

  const spinner = p.spinner();
  spinner.start(t('push.fetching'));
  let edits;
  try {
    edits = await collectEditCandidates(projectDir, binding);
  } catch (error) {
    if (error instanceof CanonicalConflictError) {
      console.error(
        t('push.canonicalConflict', {
          path: error.sourcePath,
          tools: error.tools.join(', '),
        }),
      );
      return 1;
    }
    throw error;
  }
  const proposals = await readPendingProposals(projectDir);
  const proposed = await collectProposalCandidates(projectDir, proposals);
  spinner.stop(t('common.done'));

  const all = [...edits, ...proposed];
  if (all.length === 0) {
    console.log(t('push.noCandidates'));
    return 0;
  }

  const nonInteractive = useNonInteractive(opts);
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
    selected = all.map((c) => c.sourcePath);
    message = opts.message!;
    if (!opts.yes) {
      if (!isInteractiveStdin()) {
        console.error(t('cli.nonInteractiveConfirmRequired'));
        return 1;
      }
      const confirm = await p.confirm({
        message: t('push.confirm', { count: selected.length }),
        initialValue: true,
      });
      if (p.isCancel(confirm) || !confirm) {
        console.log(t('common.cancelled'));
        return 1;
      }
    }
  } else {
    const picked = (await p.multiselect({
      message: t('push.prompt.select'),
      options: all.map((c) => ({ value: c.sourcePath, label: c.sourcePath })),
      required: true,
    })) as string[];
    if (p.isCancel(picked) || picked.length === 0) {
      console.log(t('common.cancelled'));
      return 1;
    }
    selected = picked;

    const msg = await p.text({
      message: t('push.prompt.message'),
      defaultValue: 'chore: update imwel artifacts',
    });
    if (p.isCancel(msg)) {
      console.log(t('common.cancelled'));
      return 1;
    }
    message = String(msg);

    if (!opts.yes) {
      const confirm = await p.confirm({
        message: t('push.confirm', { count: selected.length }),
        initialValue: true,
      });
      if (p.isCancel(confirm) || !confirm) {
        console.log(t('common.cancelled'));
        return 1;
      }
    }
  }

  const candidates = all.filter((c) => selected.includes(c.sourcePath));
  const result = await executePush(binding, candidates, message);
  if (result.directPush) {
    console.log(t('push.directPush', { branch: result.branch }));
  } else {
    console.log(t('push.success', { branch: result.branch }));
    console.log(t('push.compareUrl', { url: result.compareUrl }));
    // Non-interactive: never auto-create PR — only print compare URL.
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
            binding.branch,
            result.branch,
          );
          if (prUrl) {
            console.log(t('push.prCreated', { url: prUrl }));
          }
        }
      }
    }
  }
  await clearPendingProposals(projectDir);
  p.outro(t('common.done'));
  return 0;
}
