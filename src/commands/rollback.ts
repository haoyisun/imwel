import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import { readBinding, writeBinding } from '../core/binding.js';
import {
  collectInstalledPaths,
  listFilesAtCommit,
  listHistoryCommits,
  managedPathsMissingFromCommit,
  pruneBindingToCommitPaths,
  restoreToCommit,
} from '../core/history.js';
import { exitIfMissingFlags, isInteractiveStdin } from '../core/cli-flags.js';
import { t } from '../locales/index.js';

export interface RollbackOptions {
  yes?: boolean;
  to?: string;
}

function useNonInteractive(opts: RollbackOptions): boolean {
  return !isInteractiveStdin() || Boolean(opts.yes) || Boolean(opts.to);
}

export async function runRollback(opts: RollbackOptions = {}): Promise<number> {
  p.intro(t('rollback.title'));
  const projectDir = process.cwd();
  const nonInteractive = useNonInteractive(opts);

  if (nonInteractive) {
    const missing = exitIfMissingFlags({ '--to': opts.to });
    if (missing !== null) {
      return missing;
    }
  }

  const binding = await readBinding(projectDir);
  if (!binding) {
    console.error(t('sync.noBinding'));
    return 1;
  }

  const commits = await listHistoryCommits(projectDir);
  if (commits.length === 0) {
    console.error(t('rollback.noHistory'));
    return 1;
  }

  let selected: string;

  if (nonInteractive) {
    selected = opts.to!;
    const known = commits.some(
      (c) => c.sha === selected || c.sha.startsWith(selected),
    );
    if (!known) {
      // Allow full SHA even if truncated list missed it — verify via ls-tree below.
      try {
        await listFilesAtCommit(projectDir, selected);
      } catch {
        console.error(t('rollback.unknownCommit', { sha: selected }));
        return 1;
      }
    } else {
      const match = commits.find(
        (c) => c.sha === selected || c.sha.startsWith(selected),
      );
      if (match) {
        selected = match.sha;
      }
    }
  } else {
    const picked = (await p.select({
      message: t('rollback.prompt'),
      options: commits.map((c) => ({
        value: c.sha,
        label: `${c.sha.slice(0, 8)} ${c.subject}`,
      })),
    })) as string;
    if (p.isCancel(picked)) {
      console.log(t('common.cancelled'));
      return 1;
    }
    selected = picked;
  }

  const managedPaths = collectInstalledPaths(binding);
  let commitTreePaths: string[];
  try {
    commitTreePaths = await listFilesAtCommit(projectDir, selected);
  } catch {
    console.error(t('rollback.unknownCommit', { sha: selected }));
    return 1;
  }

  const toDelete = managedPathsMissingFromCommit(managedPaths, commitTreePaths);
  if (toDelete.length > 0) {
    console.log(t('rollback.delete.title'));
    for (const rel of toDelete) {
      console.log(t('rollback.delete.entry', { path: rel }));
    }
    if (!opts.yes) {
      if (!isInteractiveStdin()) {
        console.error(t('cli.nonInteractiveConfirmRequired'));
        return 1;
      }
      const confirm = await p.confirm({
        message: t('rollback.delete.confirm', { count: toDelete.length }),
        initialValue: false,
      });
      if (p.isCancel(confirm) || !confirm) {
        console.log(t('common.cancelled'));
        return 1;
      }
    }
  }

  const restorePaths = managedPaths.filter((p) =>
    commitTreePaths.map((c) => c.replace(/\\/g, '/')).includes(p.replace(/\\/g, '/')),
  );
  if (restorePaths.length > 0) {
    await restoreToCommit(projectDir, selected, restorePaths);
  }

  for (const rel of toDelete) {
    const abs = path.join(projectDir, rel);
    await fs.rm(abs, { force: true });
  }

  const pruned = pruneBindingToCommitPaths(binding, commitTreePaths);
  await writeBinding(projectDir, {
    ...pruned,
    lastSyncedHistoryCommit: selected,
  });
  console.log(t('rollback.success', { sha: selected.slice(0, 8) }));
  p.outro(t('common.done'));
  return 0;
}
