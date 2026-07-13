import path from 'node:path';
import { readYamlFile } from './yaml-file.js';
import { pathExists } from './fs-utils.js';

export class ManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ManifestError';
  }
}

export interface ManifestConventions {
  rulesDir: string;
  skillsDir: string;
  agentsFile: string;
}

export interface ManifestProject {
  name: string;
  path: string;
  optional?: string[];
  conventions?: Partial<ManifestConventions>;
}

export interface Manifest {
  conventions: ManifestConventions;
  projects: ManifestProject[];
}

const DEFAULT_CONVENTIONS: ManifestConventions = {
  rulesDir: 'rules',
  skillsDir: 'skills',
  agentsFile: 'agents.md',
};

export async function readManifest(repoRoot: string): Promise<Manifest> {
  const manifestPath = path.join(repoRoot, '.imwel', 'manifest.yaml');
  if (!(await pathExists(manifestPath))) {
    throw new ManifestError('No .imwel/manifest.yaml found in template repository');
  }
  const raw = await readYamlFile<Partial<Manifest>>(manifestPath);
  return validateManifest(raw);
}

export function validateManifest(raw: Partial<Manifest> | null): Manifest {
  if (!raw) {
    throw new ManifestError('Manifest is empty or invalid');
  }
  const conventions = {
    ...DEFAULT_CONVENTIONS,
    ...(raw.conventions ?? {}),
  };
  if (!raw.projects || !Array.isArray(raw.projects) || raw.projects.length === 0) {
    throw new ManifestError('Manifest must declare at least one project');
  }
  const projects: ManifestProject[] = raw.projects.map((project, index) => {
    if (!project?.name || !project.path) {
      throw new ManifestError(`Project at index ${index} must have name and path`);
    }
    return {
      name: project.name,
      path: project.path.replace(/\\/g, '/'),
      optional: project.optional?.map((p) => p.replace(/\\/g, '/')),
      conventions: project.conventions,
    };
  });
  return { conventions, projects };
}

export function resolveConventions(
  manifest: Manifest,
  projectName: string,
): { project: ManifestProject; conventions: ManifestConventions } {
  const project = findProject(manifest, projectName);
  return {
    project,
    conventions: {
      ...manifest.conventions,
      ...(project.conventions ?? {}),
    },
  };
}

export function findProject(manifest: Manifest, projectName: string): ManifestProject {
  const project = manifest.projects.find((p) => p.name === projectName);
  if (!project) {
    throw new ManifestError(`Project not found in manifest: ${projectName}`);
  }
  return project;
}
