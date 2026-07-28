import fs from 'node:fs/promises';
import path from 'node:path';
import { execa } from 'execa';
import type { HostCli } from './host-cli.js';
import { pathExists } from './fs-utils.js';
import { runGit } from './git.js';

/**
 * Plain shell hook: runs `imwel lint` before each commit. Language-agnostic —
 * kept as a single source of truth rather than duplicated across locale scaffold
 * trees. Degrades gracefully when imwel is not on PATH (warn + exit 0) so a
 * missing imwel never blocks a commit on another machine or in CI.
 */
export const PRE_COMMIT_HOOK = `#!/usr/bin/env sh
# imwel template lint hook — runs \`imwel lint\` before each commit.
# Activate once after clone:  git config core.hooksPath .githooks
if ! command -v imwel >/dev/null 2>&1; then
  echo "⚠ imwel not on PATH — skipping lint. Install: npm i -g @culock/imwel" >&2
  exit 0
fi
imwel lint
`;

export const GITHUB_LINT_WORKFLOW = `name: imwel lint
on:
  pull_request:
  push:
    branches: [main, master]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g @culock/imwel
      - run: imwel lint --strict
`;

export const GITLAB_LINT_CI = `imwel-lint:
  image: node:20
  script:
    - npm install -g @culock/imwel
    - imwel lint --strict
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
`;

export interface LintAutomationResult {
  hookWritten: boolean;
  hookSkippedExisting: boolean;
  activatedLocally: boolean;
  /** Relative path of the CI workflow file written, or null when skipped. */
  ciFile: string | null;
  contributingUpdated: boolean;
}

export interface SetupLintAutomationOptions {
  hostCli: HostCli;
  /** Run `git config core.hooksPath .githooks` — only true when a `.git` exists. */
  activateLocally: boolean;
  /** Absolute path to CONTRIBUTING.md to append the activation note to (optional). */
  contributingPath?: string;
  /** Localized activation note line to append to CONTRIBUTING.md. */
  activationNote?: string;
}

/**
 * Write the committed `.githooks/pre-commit` hook, optionally activate it
 * locally via `core.hooksPath`, write the matching CI workflow file when a
 * hosting CLI is detected, and append the activation note to CONTRIBUTING.md.
 * Opt-in only — callers prompt the user first. Never overwrites an existing
 * `.githooks/pre-commit`.
 */
export async function setupLintAutomation(
  repoDir: string,
  options: SetupLintAutomationOptions,
): Promise<LintAutomationResult> {
  const result: LintAutomationResult = {
    hookWritten: false,
    hookSkippedExisting: false,
    activatedLocally: false,
    ciFile: null,
    contributingUpdated: false,
  };

  const hookDir = path.join(repoDir, '.githooks');
  const hookPath = path.join(hookDir, 'pre-commit');
  if (await pathExists(hookPath)) {
    result.hookSkippedExisting = true;
  } else {
    await fs.mkdir(hookDir, { recursive: true });
    await fs.writeFile(hookPath, PRE_COMMIT_HOOK, 'utf8');
    await fs.chmod(hookPath, 0o755);
    result.hookWritten = true;
  }

  if (options.activateLocally && (await pathExists(path.join(repoDir, '.git')))) {
    await runGit(['config', 'core.hooksPath', '.githooks'], { cwd: repoDir });
    result.activatedLocally = true;
  }

  if (options.hostCli === 'gh') {
    const ciPath = path.join(repoDir, '.github', 'workflows', 'imwel-lint.yml');
    await fs.mkdir(path.dirname(ciPath), { recursive: true });
    await fs.writeFile(ciPath, GITHUB_LINT_WORKFLOW, 'utf8');
    result.ciFile = path.relative(repoDir, ciPath).replace(/\\/g, '/');
  } else if (options.hostCli === 'glab') {
    const ciPath = path.join(repoDir, '.gitlab-ci.yml');
    await fs.writeFile(ciPath, GITLAB_LINT_CI, 'utf8');
    result.ciFile = path.relative(repoDir, ciPath).replace(/\\/g, '/');
  }

  if (options.contributingPath && options.activationNote) {
    const existing = await pathExists(options.contributingPath)
      ? await fs.readFile(options.contributingPath, 'utf8')
      : '';
    if (existing && !existing.includes('core.hooksPath .githooks')) {
      const sep = existing.endsWith('\n') ? '\n' : '\n\n';
      await fs.writeFile(
        options.contributingPath,
        `${existing}${sep}${options.activationNote}\n`,
        'utf8',
      );
      result.contributingUpdated = true;
    }
  }

  return result;
}

/**
 * Passive activation hint for `imwel lint` (and similar template-context
 * commands): returns true when the template repo ships a `.githooks/` dir but
 * `core.hooksPath` is not pointing at it — i.e. a contributor cloned but did
 * not activate. Read-only; never modifies git config.
 */
export async function shouldHintLintHookActivation(repoDir: string): Promise<boolean> {
  if (!(await pathExists(path.join(repoDir, '.githooks')))) {
    return false;
  }
  const current = await readHooksPath(repoDir);
  return current !== '.githooks';
}

async function readHooksPath(repoDir: string): Promise<string | null> {
  const result = await execa('git', ['config', 'core.hooksPath'], {
    cwd: repoDir,
    reject: false,
  });
  if (result.exitCode !== 0) {
    return null;
  }
  const value = result.stdout.trim();
  return value === '' ? null : value;
}
