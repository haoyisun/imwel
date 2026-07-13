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

export async function addRemote(
  alias: string,
  remote: RemoteConfig,
): Promise<void> {
  const config = await loadGlobalConfig();
  if (config.remotes[alias]) {
    throw new Error(`Remote alias already exists: ${alias}`);
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
