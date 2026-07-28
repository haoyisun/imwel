import * as p from '@clack/prompts';
import { t } from '../locales/index.js';
import { info } from './cli-output.js';

export interface SelectableItem {
  value: string;
  label: string;
  hint?: string;
}

export interface SelectDiffResult {
  selected: string[];
  added: string[];
  removed: string[];
}

/**
 * Batch selection UX shared by `init` and `imwel modules`:
 * toggle with space → show an added/removed diff → confirm again → return.
 *
 * `installed` are pre-checked and, in the caller's item list, expected to be
 * ordered first. Returns null when the user cancels at any step.
 */
export async function selectWithDiffConfirm(opts: {
  message: string;
  items: SelectableItem[];
  installed: string[];
  required?: boolean;
}): Promise<SelectDiffResult | null> {
  const installedSet = new Set(opts.installed);
  const selection = (await p.multiselect({
    message: opts.message,
    options: opts.items.map((item) => ({
      value: item.value,
      label: installedSet.has(item.value) ? t('select.installed', { name: item.label }) : item.label,
      hint: item.hint,
    })),
    initialValues: opts.installed,
    required: Boolean(opts.required),
  })) as string[] | symbol;

  if (p.isCancel(selection)) {
    return null;
  }

  const selected = selection as string[];
  const selectedSet = new Set(selected);
  const added = selected.filter((v) => !installedSet.has(v));
  const removed = opts.installed.filter((v) => !selectedSet.has(v));

  info(t('select.diff.title'));
  if (added.length === 0 && removed.length === 0) {
    info(t('select.diff.none'));
  } else {
    for (const name of added) {
      info(t('select.diff.added', { name }));
    }
    for (const name of removed) {
      info(t('select.diff.removed', { name }));
    }
  }

  const confirm = await p.confirm({ message: t('select.confirm'), initialValue: true });
  if (p.isCancel(confirm) || !confirm) {
    return null;
  }

  return { selected, added, removed };
}
