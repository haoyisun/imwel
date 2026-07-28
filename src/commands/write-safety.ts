import * as p from '@clack/prompts';
import type { InspectedRenderedFile } from '../core/apply-files.js';
import { overwriteRisks } from '../core/managed-write-safety.js';
import { isInteractiveStdin } from '../core/cli-flags.js';
import { t } from '../locales/index.js';

export async function confirmRenderedFileWrites(
  files: InspectedRenderedFile[],
  yes: boolean,
): Promise<boolean> {
  console.log(t('writeSafety.plan.title'));
  for (const file of files) {
    console.log(t(`writeSafety.plan.${file.status}`, { path: file.path }));
  }

  const risks = overwriteRisks(files);
  if (risks.length === 0 || yes) {
    return true;
  }
  if (!isInteractiveStdin()) {
    console.error(t('writeSafety.nonInteractive', { paths: risks.map((file) => file.path).join(', ') }));
    return false;
  }

  const confirm = await p.confirm({
    message: t('writeSafety.confirm', {
      count: risks.length,
      paths: risks.map((file) => file.path).join(', '),
    }),
    initialValue: false,
  });
  return !p.isCancel(confirm) && confirm;
}
