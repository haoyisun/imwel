import process from 'node:process';
import { error as outputError, info, success } from '../core/cli-output.js';
import { assertGitVersion, MIN_GIT_VERSION } from '../core/git.js';
import { imwelHome } from '../core/paths.js';
import { t } from '../locales/index.js';

export async function runDoctor(): Promise<number> {
  info(t('doctor.title'));
  try {
    const version = await assertGitVersion(MIN_GIT_VERSION);
    success(t('doctor.gitOk', { version }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('ENOENT') || message.includes('not found')) {
      outputError(t('doctor.gitMissing'));
    } else if (message.includes('older')) {
      outputError(t('doctor.gitTooOld', { found: message, required: MIN_GIT_VERSION }));
    } else {
      outputError(t('common.error', { message }));
    }
    return 1;
  }
  success(t('doctor.nodeOk', { version: process.version }));
  success(t('doctor.homeOk', { path: imwelHome() }));
  info(t('doctor.authorHint'));
  success(t('doctor.allOk'));
  return 0;
}
