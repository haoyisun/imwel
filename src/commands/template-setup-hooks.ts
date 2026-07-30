import path from 'node:path';
import * as p from '@clack/prompts';
import { detectImwelContext } from '../core/detect-context.js';
import { detectHostCli, type HostCli } from '../core/host-cli.js';
import { pathExists } from '../core/fs-utils.js';
import { isInteractiveStdin } from '../core/cli-flags.js';
import { error, info, success, warn } from '../core/cli-output.js';
import {
  activateLintHook,
  setupLintAutomation,
  shouldHintLintHookActivation,
  writePreparePackageJson,
} from '../core/lint-automation.js';
import { t } from '../locales/index.js';

export interface SetupHooksOptions {
  dir?: string;
  yes?: boolean;
  prepare?: boolean;
  noCi?: boolean;
  noActivate?: boolean;
  /** Override for tests; when omitted, detected at runtime. */
  hostCli?: HostCli;
  cwd?: string;
}

/**
 * Retrofit commit-time lint automation into an existing template repository
 * (`imwel template setup-hooks`). Writes repo files first, then optionally
 * activates `core.hooksPath` as a separate step.
 */
export async function runTemplateSetupHooks(options: SetupHooksOptions = {}): Promise<number> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const startDir = options.dir ? path.resolve(options.dir) : cwd;
  const nonInteractive = !isInteractiveStdin() || Boolean(options.yes);

  if (!nonInteractive) {
    p.intro(t('template.setupHooks.title'));
  } else {
    info(t('template.setupHooks.title'));
  }

  const context = await detectImwelContext(startDir);
  if (context.kind !== 'template' || !context.root) {
    switch (context.kind) {
      case 'consumer':
        error(t('lint.wrongContext.consumer', { root: context.root ?? startDir }));
        break;
      case 'ambiguous':
        error(t('lint.wrongContext.ambiguous', { root: context.root ?? startDir }));
        break;
      case 'neither':
      default:
        error(t('lint.wrongContext.neither'));
        break;
    }
    return 1;
  }

  const root = context.root;

  if (!nonInteractive) {
    const confirmWrite = await p.confirm({
      message: t('template.setupHooks.prompt.write'),
      initialValue: true,
    });
    if (p.isCancel(confirmWrite) || !confirmWrite) {
      info(t('common.cancelled'));
      return 1;
    }
  }

  info(t('template.setupHooks.writing', { path: root }));

  const hostCli = options.noCi ? null : (options.hostCli !== undefined ? options.hostCli : await detectHostCli());
  const automation = await setupLintAutomation(root, {
    hostCli,
    activateLocally: false,
    contributingPath: path.join(root, 'CONTRIBUTING.md'),
    activationNote: t('lintAutomation.contributingNote'),
    readmePath: path.join(root, 'README.md'),
    readmeActivationNote: t('lintAutomation.readmeNote'),
  });

  if (automation.hookSkippedExisting) {
    info(t('template.init.lintAutomation.hookSkipped'));
  }
  if (automation.contributingUpdated) {
    info(t('template.init.lintAutomation.contributing'));
  }
  if (automation.readmeUpdated) {
    info(t('template.init.lintAutomation.readme'));
  }
  info(
    automation.ciFile
      ? t('template.setupHooks.filesDone', { ci: ` + CI at ${automation.ciFile}` })
      : t('template.setupHooks.filesDoneNoCi'),
  );

  await maybeActivateHooks(root, {
    nonInteractive,
    noActivate: Boolean(options.noActivate),
  });

  if (automation.hookWritten || automation.hookSkippedExisting) {
    if (!nonInteractive) {
      const preparePkg = await p.confirm({
        message: t('template.init.prompt.preparePackageJson'),
        initialValue: false,
      });
      if (!p.isCancel(preparePkg) && preparePkg) {
        const r = await writePreparePackageJson(root, path.basename(root));
        info(
          r === 'written'
            ? t('template.init.preparePackageJson.written')
            : t('template.init.preparePackageJson.skipped'),
        );
      }
    } else if (options.prepare) {
      const r = await writePreparePackageJson(root, path.basename(root));
      info(
        r === 'written'
          ? t('template.init.preparePackageJson.written')
          : t('template.init.preparePackageJson.skipped'),
      );
    }
  }

  success(t('template.setupHooks.success', { path: root }));
  if (!nonInteractive) {
    p.outro(t('common.done'));
  } else {
    success(t('common.done'));
  }
  return 0;
}

async function maybeActivateHooks(
  root: string,
  opts: { nonInteractive: boolean; noActivate: boolean },
): Promise<void> {
  if (opts.noActivate) {
    info(t('template.setupHooks.activate.skippedByFlag'));
    return;
  }

  if (!(await pathExists(path.join(root, '.git')))) {
    warn(t('template.setupHooks.activate.noGit'));
    return;
  }

  if (!(await shouldHintLintHookActivation(root))) {
    info(t('template.setupHooks.activate.already'));
    return;
  }

  if (!opts.nonInteractive) {
    const confirmAct = await p.confirm({
      message: t('template.setupHooks.prompt.activate'),
      initialValue: true,
    });
    if (p.isCancel(confirmAct) || !confirmAct) {
      info(t('template.setupHooks.activate.declined'));
      return;
    }
  }

  if (await activateLintHook(root)) {
    success(t('lint.hookActivation.activated'));
  }
}
