import { lintExitCode, lintTemplateRepo, type LintIssue } from '../core/lint-template.js';
import { t } from '../locales/index.js';

export interface LintOptions {
  strict?: boolean;
  cwd?: string;
}

export async function runLint(options: LintOptions = {}): Promise<number> {
  const cwd = options.cwd ?? process.cwd();
  const strict = Boolean(options.strict);

  console.log(t('lint.title'));
  console.log(t('lint.detecting'));

  const result = await lintTemplateRepo(cwd, { strict });

  if (result.wrongContext) {
    switch (result.contextKind) {
      case 'consumer':
        console.error(
          t('lint.wrongContext.consumer', {
            root: result.root ?? cwd,
          }),
        );
        break;
      case 'ambiguous':
        console.error(
          t('lint.wrongContext.ambiguous', {
            root: result.root ?? cwd,
          }),
        );
        break;
      case 'neither':
      default:
        console.error(t('lint.wrongContext.neither'));
        break;
    }
    return 1;
  }

  console.log(t('lint.checking', { root: result.root ?? cwd }));

  const errors = result.issues.filter((i) => i.severity === 'error');
  const warnings = result.issues.filter((i) => i.severity === 'warning');

  for (const issue of result.issues) {
    printIssue(issue);
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log(t('lint.clean'));
  } else {
    console.log(
      t('lint.summary', {
        errors: errors.length,
        warnings: warnings.length,
      }),
    );
  }

  if (strict && warnings.length > 0 && errors.length === 0) {
    console.error(t('lint.strictFailed'));
  }

  return lintExitCode(result, strict);
}

function printIssue(issue: LintIssue): void {
  const loc = issue.path ? ` (${issue.path})` : '';
  if (issue.severity === 'error') {
    console.error(t('lint.issue.error', { code: issue.code, message: issue.message, loc }));
  } else {
    console.log(t('lint.issue.warning', { code: issue.code, message: issue.message, loc }));
  }
}
