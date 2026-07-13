import fs from 'node:fs/promises';
import path from 'node:path';
import { pendingProposalsPath } from './paths.js';
import { readYamlFile, writeYamlFile } from './yaml-file.js';
import type { ArtifactType } from './artifact-types.js';

export interface PendingProposal {
  localPath: string;
  remote: string;
  project: string;
  type: ArtifactType;
  optional: boolean;
  tool: string;
}

export interface PendingProposalsFile {
  proposals: PendingProposal[];
}

export async function readPendingProposals(projectDir: string): Promise<PendingProposal[]> {
  const data = await readYamlFile<PendingProposalsFile>(pendingProposalsPath(projectDir));
  return data?.proposals ?? [];
}

export async function addPendingProposal(
  projectDir: string,
  proposal: PendingProposal,
): Promise<void> {
  const existing = await readPendingProposals(projectDir);
  const filtered = existing.filter((p) => p.localPath !== proposal.localPath);
  filtered.push(proposal);
  await writeYamlFile(pendingProposalsPath(projectDir), { proposals: filtered });
}

export async function clearPendingProposals(projectDir: string): Promise<void> {
  try {
    await fs.rm(pendingProposalsPath(projectDir), { force: true });
  } catch {
    // ignore
  }
}

export function buildProposal(
  localPath: string,
  remote: string,
  project: string,
  type: ArtifactType,
  optional: boolean,
  tool: string,
): PendingProposal {
  return {
    localPath: localPath.replace(/\\/g, '/'),
    remote,
    project,
    type,
    optional,
    tool,
  };
}
