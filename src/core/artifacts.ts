import fs from 'node:fs/promises';
import path from 'node:path';
import type { Artifact, ArtifactType } from './artifact-types.js';
import type { ManifestConventions, ManifestProject } from './manifest.js';
import { pathExists } from './fs-utils.js';
import { parseFrontmatter } from './frontmatter.js';
import { parseRuleOverlay } from './rule-overlay.js';

async function readTextIfExists(filePath: string): Promise<string | null> {
  if (!(await pathExists(filePath))) {
    return null;
  }
  return fs.readFile(filePath, 'utf8');
}

async function listFilesRecursive(dir: string, base = dir): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(full, base)));
    } else {
      files.push(path.relative(base, full).replace(/\\/g, '/'));
    }
  }
  return files;
}

function classifyArtifact(
  relativePath: string,
  conventions: ManifestConventions,
): ArtifactType | null {
  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized === conventions.agentsFile) {
    return 'agents';
  }
  const rulesPrefix = `${conventions.rulesDir}/`;
  if (normalized.startsWith(rulesPrefix) && normalized.endsWith('.md')) {
    return 'rule';
  }
  const skillsPrefix = `${conventions.skillsDir}/`;
  if (normalized.startsWith(skillsPrefix)) {
    if (normalized.endsWith('/SKILL.md') || normalized.endsWith('SKILL.md')) {
      return 'skill';
    }
  }
  return null;
}

function skillRoot(relativePath: string, conventions: ManifestConventions): string | null {
  const normalized = relativePath.replace(/\\/g, '/');
  const prefix = `${conventions.skillsDir}/`;
  if (!normalized.startsWith(prefix)) {
    return null;
  }
  const rest = normalized.slice(prefix.length);
  const parts = rest.split('/');
  if (parts.length < 2) {
    return null;
  }
  return `${prefix}${parts[0]}`;
}

export async function discoverArtifacts(
  repoRoot: string,
  project: ManifestProject,
  conventions: ManifestConventions,
  selectedOptional?: Set<string>,
): Promise<Artifact[]> {
  const projectDir = path.join(repoRoot, project.path);
  const allFiles = await listFilesRecursive(projectDir);
  const optionalSet = new Set((project.optional ?? []).map((p) => p.replace(/\\/g, '/')));
  const artifacts: Artifact[] = [];
  const seenSkills = new Set<string>();

  for (const rel of allFiles.sort()) {
    const type = classifyArtifact(rel, conventions);
    if (!type) {
      continue;
    }
    const optional = optionalSet.has(rel);
    if (optional && selectedOptional && !selectedOptional.has(rel)) {
      continue;
    }
    if (type === 'skill') {
      const root = skillRoot(rel, conventions);
      if (!root || seenSkills.has(root)) {
        continue;
      }
      seenSkills.add(root);
      const skillOptional = optionalSet.has(root) || optionalSet.has(rel);
      if (skillOptional && selectedOptional && !selectedOptional.has(root) && !selectedOptional.has(rel)) {
        continue;
      }
      const bundleDir = path.join(projectDir, ...root.split('/'));
      const bundleFiles = await listFilesRecursive(bundleDir);
      const files = await Promise.all(
        bundleFiles.map(async (bundleRel) => ({
          relativePath: bundleRel,
          content: await fs.readFile(path.join(bundleDir, bundleRel), 'utf8'),
        })),
      );
      const skillMd = files.find((f) => f.relativePath === 'SKILL.md' || f.relativePath.endsWith('/SKILL.md'));
      const skillDescription = skillMd
        ? parseFrontmatter(skillMd.content).frontmatter.description
        : undefined;
      artifacts.push({
        sourcePath: root,
        project: project.name,
        type: 'skill',
        optional: skillOptional,
        canonicalContent: skillMd?.content ?? '',
        bundleFiles: files,
        targetOverrides:
          typeof skillDescription === 'string' && skillDescription.trim()
            ? { description: skillDescription }
            : undefined,
      });
      continue;
    }
    const content = await readTextIfExists(path.join(projectDir, rel));
    if (content === null) {
      continue;
    }
    const { body, overrides } = parseRuleOverlay(content);
    artifacts.push({
      sourcePath: rel.replace(/\\/g, '/'),
      project: project.name,
      type,
      optional,
      canonicalContent: body,
      targetOverrides: overrides,
    });
  }
  return artifacts;
}
