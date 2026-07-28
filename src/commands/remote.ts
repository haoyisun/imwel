import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import {
  addRemote,
  DuplicateRemoteUrlError,
  getRemote,
  listRemotes,
  removeRemote,
  setRemote,
} from '../core/config.js';
import { remoteCacheDir } from '../core/paths.js';
import { ensureRemoteCache } from '../core/remote-cache.js';
import { listBoundDirectories } from '../core/binding-registry.js';
import { deriveRemoteAlias, looksLikeUrl } from '../core/remote-alias.js';
import { t } from '../locales/index.js';

export interface RemoteAddInput {
  /** First positional argument: a URL (single-arg form) or an alias (two-arg form). */
  urlOrAlias: string;
  /** Second positional argument: the URL, when the alias-first form is used. */
  url?: string;
  /** Explicit alias override (`--as`). */
  as?: string;
  directPush?: boolean;
}

/**
 * Resolve `remote add` arguments into a concrete (alias, url). Supports:
 * - `add <alias> <url>` — backward-compatible alias-first form.
 * - `add <url>` — single URL; alias is derived (or taken from `--as`).
 */
export async function resolveRemoteAddArgs(
  input: RemoteAddInput,
): Promise<{ alias: string; url: string } | { error: string }> {
  if (input.url !== undefined) {
    return { alias: input.as ?? input.urlOrAlias, url: input.url };
  }
  if (!looksLikeUrl(input.urlOrAlias)) {
    return { error: t('remote.add.needUrl') };
  }
  const url = input.urlOrAlias;
  if (input.as) {
    return { alias: input.as, url };
  }
  const existing = Object.keys(await listRemotes());
  return { alias: deriveRemoteAlias(url, existing), url };
}

export async function runRemoteAdd(input: RemoteAddInput): Promise<number> {
  const resolved = await resolveRemoteAddArgs(input);
  if ('error' in resolved) {
    console.error(resolved.error);
    return 1;
  }
  const { alias, url } = resolved;
  const derived = input.url === undefined && !input.as;
  try {
    await addRemote(alias, { url, directPush: Boolean(input.directPush), defaultBranch: 'main' });
  } catch (error) {
    if (error instanceof DuplicateRemoteUrlError) {
      console.error(t('remote.add.duplicateUrl', { alias: error.existingAlias, url }));
      return 1;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('already exists')) {
      console.error(t('remote.add.exists', { alias }));
      return 1;
    }
    console.error(t('common.error', { message }));
    return 1;
  }
  const spinner = p.spinner();
  spinner.start(t('remote.add.cloning', { alias }));
  try {
    await ensureRemoteCache(alias, { force: true });
  } catch (error) {
    spinner.stop(t('common.error', { message: error instanceof Error ? error.message : String(error) }));
    return 1;
  }
  spinner.stop(t('common.done'));
  if (derived) {
    console.log(t('remote.add.derivedAlias', { alias }));
  }
  console.log(t('remote.add.success', { alias, url }));
  return 0;
}

export async function runRemoteList(): Promise<number> {
  const remotes = await listRemotes();
  const keys = Object.keys(remotes);
  if (keys.length === 0) {
    console.log(t('remote.list.empty'));
    return 0;
  }
  console.log(t('remote.list.title'));
  for (const alias of keys) {
    const remote = remotes[alias]!;
    console.log(
      t('remote.list.entry', {
        alias,
        url: remote.url,
        branch: remote.defaultBranch ?? 'main',
        directPush: String(Boolean(remote.directPush)),
      }),
    );
  }
  return 0;
}

export async function runRemoteRemove(alias: string, yes = false): Promise<number> {
  const remote = await getRemote(alias);
  if (!remote) {
    console.error(t('common.notFound', { name: alias }));
    return 1;
  }
  const bound = await listBoundDirectories(alias);
  if (bound.length > 0) {
    console.log(t('remote.remove.boundWarning', { count: bound.length, alias }));
  }
  if (!yes) {
    const confirm = await p.confirm({ message: t('remote.remove.confirm', { alias }) });
    if (p.isCancel(confirm) || !confirm) {
      console.log(t('common.cancelled'));
      return 1;
    }
  }
  await removeRemote(alias);
  await fs.rm(remoteCacheDir(alias), { recursive: true, force: true });
  console.log(t('remote.remove.success', { alias }));
  return 0;
}

export async function runRemoteSet(alias: string, directPush?: boolean): Promise<number> {
  const remote = await getRemote(alias);
  if (!remote) {
    console.error(t('common.notFound', { name: alias }));
    return 1;
  }
  if (directPush === undefined) {
    console.error(t('common.error', { message: 'No options provided' }));
    return 1;
  }
  await setRemote(alias, { directPush });
  console.log(t('remote.set.success', { alias }));
  return 0;
}

export async function runRemoteInteractive(subcommand?: string): Promise<number> {
  if (subcommand === 'list' || !subcommand) {
    return runRemoteList();
  }
  if (subcommand === 'add') {
    const url = await p.text({ message: t('remote.prompt.url') });
    if (p.isCancel(url)) {
      console.log(t('common.cancelled'));
      return 1;
    }
    const existing = Object.keys(await listRemotes());
    const suggested = deriveRemoteAlias(String(url), existing);
    const alias = await p.text({
      message: t('remote.prompt.alias'),
      defaultValue: suggested,
      placeholder: suggested,
    });
    if (p.isCancel(alias)) {
      console.log(t('common.cancelled'));
      return 1;
    }
    const direct = await p.confirm({ message: t('remote.prompt.directPush'), initialValue: false });
    if (p.isCancel(direct)) {
      console.log(t('common.cancelled'));
      return 1;
    }
    return runRemoteAdd({
      urlOrAlias: String(alias || suggested),
      url: String(url),
      directPush: Boolean(direct),
    });
  }
  console.error(t('common.error', { message: `Unknown remote subcommand: ${subcommand}` }));
  return 1;
}
