import process from 'node:process';
import { assertGitVersion, MIN_GIT_VERSION } from '../core/git.js';
import { imwelHome } from '../core/paths.js';
import { t } from '../locales/index.js';

export async function runDoctor(): Promise<number> {
  console.log(t('doctor.title'));
  try {
    const version = await assertGitVersion(MIN_GIT_VERSION);
    console.log(t('doctor.gitOk', { version }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('ENOENT') || message.includes('not found')) {
      console.error(t('doctor.gitMissing'));
    } else if (message.includes('older')) {
      console.error(t('doctor.gitTooOld', { found: message, required: MIN_GIT_VERSION }));
    } else {
      console.error(t('common.error', { message }));
    }
    return 1;
  }
  console.log(t('doctor.nodeOk', { version: process.version }));
  console.log(t('doctor.homeOk', { path: imwelHome() }));
  console.log(t('doctor.authorHint'));
  console.log(t('doctor.allOk'));
  return 0;
}
