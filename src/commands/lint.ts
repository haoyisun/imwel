import { lintExitCode, lintTemplateRepo, type LintIssue } from '../core/lint-template.js';
import { activateLintHook, shouldHintLintHookActivation } from '../core/lint-automation.js';
import { error, info, success, warn } from '../core/cli-output.js';
import { t } from '../locales/index.js';

export interface LintOptions {
  strict?: boolean;
  cwd?: string;
  /** Auto-activate `.githooks/` via `core.hooksPath` when detected and unset. Default true; `--no-auto-activate-hooks` opts out. */
  autoActivateHooks?: boolean;
}

export async function runLint(options: LintOptions = {}): Promise<number> {
  const cwd = options.cwd ?? process.cwd();
  const strict = Boolean(options.strict);

  info(t('lint.title'));
  info(t('lint.detecting'));

  const result = await lintTemplateRepo(cwd, { strict });

  if (result.wrongContext) {
    switch (result.contextKind) {
      case 'consumer':
        error(
          t('lint.wrongContext.consumer', {
            root: result.root ?? cwd,
          }),
        );
        break;
      case 'ambiguous':
        error(
          t('lint.wrongContext.ambiguous', {
            root: result.root ?? cwd,
          }),
        );
        break;
      case 'neither':
      default:
        error(t('lint.wrongContext.neither'));
        break;
    }
    return 1;
  }

  info(t('lint.checking', { root: result.root ?? cwd }));

  if (result.root && (await shouldHintLintHookActivation(result.root))) {
    if (options.autoActivateHooks === false) {
      warn(t('lint.hookActivation.hint'));
    } else if (await activateLintHook(result.root)) {
      success(t('lint.hookActivation.activated'));
    }
  }

  const errors = result.issues.filter((i) => i.severity === 'error');
  const warnings = result.issues.filter((i) => i.severity === 'warning');

  for (const issue of result.issues) {
    printIssue(issue);
  }

  if (errors.length === 0 && warnings.length === 0) {
    success(t('lint.clean'));
  } else {
    info(
      t('lint.summary', {
        errors: errors.length,
        warnings: warnings.length,
      }),
    );
  }

  if (strict && warnings.length > 0 && errors.length === 0) {
    error(t('lint.strictFailed'));
  }

  return lintExitCode(result, strict);
}

function printIssue(issue: LintIssue): void {
  const loc = issue.path ? ` (${issue.path})` : '';
  if (issue.severity === 'error') {
    error(t('lint.issue.error', { code: issue.code, message: issue.message, loc }));
  } else {
    warn(t('lint.issue.warning', { code: issue.code, message: issue.message, loc }), {
      target: 'stdout',
    });
  }
}
