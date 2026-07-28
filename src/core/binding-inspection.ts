import fs from 'node:fs/promises';
import path from 'node:path';
import { readBinding, type Binding, type BindingMode } from './binding.js';
import {
  readPendingProposalsReadonly,
  type PendingProposal,
} from './propose.js';
import type { ArtifactType } from './artifact-types.js';
import type { ProjectRole } from './manifest.js';

export type PathStatus = 'present' | 'missing';

export interface InspectedPath {
  path: string;
  status: PathStatus;
}

export interface ManagedArtifactInspection {
  project: string;
  role: BindingMode;
  type: ArtifactType;
  requirement: 'required' | 'optional';
  canonicalPath: string;
  installedPaths: Array<InspectedPath & { tool: string }>;
}

export interface BindingInspection {
  remoteAlias: string;
  branch: string;
  linkedProject: string | null;
  modules: Array<{ name: string; frozen: boolean }>;
  tools: string[];
  sync: {
    remoteCommit: string;
    historyCommit: string;
  };
  managedArtifactCount: number;
  managedArtifacts: ManagedArtifactInspection[];
}

export interface ContributionInspection {
  target: {
    remoteAlias: string;
    project: string;
  };
  role: ProjectRole;
  status: 'pending' | 'pushed';
  type: ArtifactType;
  requirement: 'required' | 'optional';
  canonicalPath: string;
  tool: string;
  sourceFiles: InspectedPath[];
  latestPush: {
    branch: string;
    commit: string;
  } | null;
}

export interface ContributionTrackingInspection {
  count: number;
  records: ContributionInspection[];
}

export interface BindingInspectionView {
  schemaVersion: 1;
  binding: BindingInspection | null;
  contributionTracking: ContributionTrackingInspection | null;
}

function canonicalPath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '');
}

function localPath(projectDir: string, value: string): { absolute: string; display: string } {
  const absolute = path.isAbsolute(value) ? path.normalize(value) : path.resolve(projectDir, value);
  const display = path.relative(projectDir, absolute).split(path.sep).join('/') || '.';
  return { absolute, display };
}

async function inspectLocalPath(projectDir: string, value: string): Promise<InspectedPath> {
  const normalized = localPath(projectDir, value);
  try {
    await fs.access(normalized.absolute);
    return { path: normalized.display, status: 'present' };
  } catch {
    return { path: normalized.display, status: 'missing' };
  }
}

async function inspectBinding(
  projectDir: string,
  binding: Binding,
): Promise<BindingInspection> {
  const projectModes = new Map(binding.projects.map((project) => [project.name, project.mode]));
  const managedArtifacts = await Promise.all(
    binding.artifacts.map(async (artifact): Promise<ManagedArtifactInspection> => {
      const installedPaths = (
        await Promise.all(
          Object.entries(artifact.installedPaths).flatMap(([tool, paths]) =>
            paths.map(async (installedPath) => ({
              tool,
              ...(await inspectLocalPath(projectDir, installedPath)),
            })),
          ),
        )
      ).sort((a, b) => a.tool.localeCompare(b.tool) || a.path.localeCompare(b.path));
      return {
        project: artifact.project,
        role: projectModes.get(artifact.project) ?? 'linked',
        type: artifact.type,
        requirement: artifact.optional ? 'optional' : 'required',
        canonicalPath: canonicalPath(artifact.sourcePath),
        installedPaths,
      };
    }),
  );
  managedArtifacts.sort(
    (a, b) =>
      a.project.localeCompare(b.project) ||
      a.canonicalPath.localeCompare(b.canonicalPath),
  );
  return {
    remoteAlias: binding.remote,
    branch: binding.branch,
    linkedProject:
      binding.projects.find((project) => project.mode === 'linked')?.name ?? null,
    modules: binding.projects
      .filter((project) => project.mode === 'subscribed')
      .map((project) => ({ name: project.name, frozen: project.frozen === true }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    tools: [...binding.tools].sort(),
    sync: {
      remoteCommit: binding.lastSyncedCommit,
      historyCommit: binding.lastSyncedHistoryCommit,
    },
    managedArtifactCount: managedArtifacts.length,
    managedArtifacts,
  };
}

async function inspectContribution(
  projectDir: string,
  proposal: PendingProposal,
): Promise<ContributionInspection> {
  const sourceFiles = await Promise.all(
    proposal.sourceFiles.map((sourceFile) => inspectLocalPath(projectDir, sourceFile)),
  );
  sourceFiles.sort((a, b) => a.path.localeCompare(b.path));
  return {
    target: {
      remoteAlias: proposal.remote,
      project: proposal.project,
    },
    role: proposal.targetRole,
    status: proposal.pushed ? 'pushed' : 'pending',
    type: proposal.type,
    requirement: proposal.optional ? 'optional' : 'required',
    canonicalPath: canonicalPath(proposal.canonicalPath),
    tool: proposal.tool,
    sourceFiles,
    latestPush: proposal.pushed ? { ...proposal.pushed } : null,
  };
}

export async function buildBindingInspection(
  projectDir: string,
): Promise<BindingInspectionView> {
  const [binding, proposals] = await Promise.all([
    readBinding(projectDir),
    readPendingProposalsReadonly(projectDir),
  ]);
  const records = await Promise.all(
    proposals.map((proposal) => inspectContribution(projectDir, proposal)),
  );
  records.sort(
    (a, b) =>
      a.target.remoteAlias.localeCompare(b.target.remoteAlias) ||
      a.target.project.localeCompare(b.target.project) ||
      a.canonicalPath.localeCompare(b.canonicalPath),
  );
  return {
    schemaVersion: 1,
    binding: binding ? await inspectBinding(projectDir, binding) : null,
    contributionTracking:
      records.length > 0 ? { count: records.length, records } : null,
  };
}
