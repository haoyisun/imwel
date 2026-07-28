import fs from 'node:fs/promises';
import path from 'node:path';
import { globalConfigPath, imwelHome } from './paths.js';
import { readYamlFile, writeYamlFile } from './yaml-file.js';

export interface RemoteConfig {
  url: string;
  directPush?: boolean;
  defaultBranch?: string;
  lastPassiveCheck?: string;
}

export interface GlobalConfig {
  remotes: Record<string, RemoteConfig>;
}

function emptyConfig(): GlobalConfig {
  return { remotes: {} };
}

export async function loadGlobalConfig(): Promise<GlobalConfig> {
  await fs.mkdir(imwelHome(), { recursive: true });
  const data = await readYamlFile<GlobalConfig>(globalConfigPath());
  if (!data?.remotes) {
    return emptyConfig();
  }
  return data;
}

export async function saveGlobalConfig(config: GlobalConfig): Promise<void> {
  await fs.mkdir(imwelHome(), { recursive: true });
  await writeYamlFile(globalConfigPath(), config);
}

export async function listRemotes(): Promise<Record<string, RemoteConfig>> {
  const config = await loadGlobalConfig();
  return config.remotes;
}

export async function getRemote(alias: string): Promise<RemoteConfig | null> {
  const config = await loadGlobalConfig();
  return config.remotes[alias] ?? null;
}

/**
 * Normalize a Git URL for duplicate detection: strip a trailing `.git`, strip
 * trailing slashes, and lowercase the host portion (scp-like and URL forms).
 * Intentionally does not treat SSH and HTTPS forms of the same repo as equal —
 * only same-form string duplicates are caught (see design.md D2).
 */
export function normalizeRemoteUrl(url: string): string {
  let s = url.trim().replace(/\/+$/, '').replace(/\.git$/i, '');
  const scp = s.match(/^([^/]+@)([^:]+)(:.*)$/);
  if (scp) {
    s = `${scp[1]}${scp[2]!.toLowerCase()}${scp[3]}`;
  } else {
    const proto = s.match(/^([a-z][\w+.-]*:\/\/)([^/]+)(\/.*)?$/i);
    if (proto) {
      s = `${proto[1]}${proto[2]!.toLowerCase()}${proto[3] ?? ''}`;
    }
  }
  return s;
}

export class DuplicateRemoteUrlError extends Error {
  constructor(public readonly existingAlias: string) {
    super(`URL already registered under alias: ${existingAlias}`);
    this.name = 'DuplicateRemoteUrlError';
  }
}

export async function addRemote(
  alias: string,
  remote: RemoteConfig,
): Promise<void> {
  const config = await loadGlobalConfig();
  if (config.remotes[alias]) {
    throw new Error(`Remote alias already exists: ${alias}`);
  }
  const normalized = normalizeRemoteUrl(remote.url);
  const existingAlias = Object.entries(config.remotes).find(
    ([, r]) => normalizeRemoteUrl(r.url) === normalized,
  )?.[0];
  if (existingAlias) {
    throw new DuplicateRemoteUrlError(existingAlias);
  }
  config.remotes[alias] = remote;
  await saveGlobalConfig(config);
}

export async function removeRemote(alias: string): Promise<void> {
  const config = await loadGlobalConfig();
  delete config.remotes[alias];
  await saveGlobalConfig(config);
}

export async function setRemote(alias: string, patch: Partial<RemoteConfig>): Promise<void> {
  const config = await loadGlobalConfig();
  const existing = config.remotes[alias];
  if (!existing) {
    throw new Error(`Remote not found: ${alias}`);
  }
  config.remotes[alias] = { ...existing, ...patch };
  await saveGlobalConfig(config);
}

export async function updateRemotePassiveCheck(alias: string, isoTimestamp: string): Promise<void> {
  await setRemote(alias, { lastPassiveCheck: isoTimestamp });
}
