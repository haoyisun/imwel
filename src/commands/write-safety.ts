import * as p from '@clack/prompts';
import type { InspectedRenderedFile } from '../core/apply-files.js';
import { error, info } from '../core/cli-output.js';
import { overwriteRisks } from '../core/managed-write-safety.js';
import { isInteractiveStdin } from '../core/cli-flags.js';
import { t } from '../locales/index.js';

export type FinalWriteAction = 'apply' | 'back' | 'cancel';

type SelectPrompt = (options: {
  message: string;
  options: Array<{ value: FinalWriteAction; label: string }>;
  initialValue: FinalWriteAction;
}) => Promise<unknown>;

export async function promptFinalWriteAction(
  message: string,
  select: SelectPrompt = p.select,
  allowBack = true,
): Promise<FinalWriteAction> {
  const options: Array<{ value: FinalWriteAction; label: string }> = [
    { value: 'apply', label: t('writeSafety.action.apply') },
  ];
  if (allowBack) {
    options.push({ value: 'back', label: t('writeSafety.action.back') });
  }
  options.push({ value: 'cancel', label: t('writeSafety.action.cancel') });

  const selected = await select({
    message,
    options,
    initialValue: 'apply',
  });
  if (p.isCancel(selected) || selected === 'cancel') {
    return 'cancel';
  }
  return selected === 'back' ? 'back' : 'apply';
}

export async function confirmRenderedFileWrites(
  files: InspectedRenderedFile[],
  yes: boolean,
): Promise<boolean> {
  info(t('writeSafety.plan.title'));
  for (const file of files) {
    info(t(`writeSafety.plan.${file.status}`, { path: file.path }));
  }

  const risks = overwriteRisks(files);
  if (risks.length === 0 || yes) {
    return true;
  }
  if (!isInteractiveStdin()) {
    error(t('writeSafety.nonInteractive', { paths: risks.map((file) => file.path).join(', ') }));
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
