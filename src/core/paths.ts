import os from 'node:os';
import path from 'node:path';

export function imwelHome(): string {
  return process.env.IMWEL_HOME ?? path.join(os.homedir(), '.imwel');
}

export function globalConfigPath(): string {
  return path.join(imwelHome(), 'config.yaml');
}

export function remoteCacheDir(alias: string): string {
  return path.join(imwelHome(), 'cache', alias);
}

export function imwelDir(projectDir: string): string {
  return path.join(projectDir, '.imwel');
}

export function bindingFilePath(projectDir: string): string {
  return path.join(imwelDir(projectDir), 'binding.yaml');
}

export function historyRepoDir(projectDir: string): string {
  return path.join(imwelDir(projectDir), 'history');
}

export function pendingProposalsPath(projectDir: string): string {
  return path.join(imwelDir(projectDir), 'pending-proposals.yaml');
}

export function pendingSyncPath(projectDir: string): string {
  return path.join(imwelDir(projectDir), 'pending-sync.yaml');
}
