import fs from 'node:fs/promises';
import path from 'node:path';
import { pathExists, readIfExists } from '../../core/fs-utils.js';
import { extractBlock, wrapBlock } from '../../core/marked-blocks.js';
import { toSlug } from '../slug.js';
import type { ArtifactType } from '../../core/artifact-types.js';
import type { DiscoveredArtifact } from '../types.js';

function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

/** List relative file paths directly under `dir` matching `.<ext>`. Safe if `dir` is missing or a file. */
async function listFilesWithExt(
  projectDir: string,
  dir: string,
  ext: string,
): Promise<string[]> {
  const abs = path.join(projectDir, dir);
  if (!(await pathExists(abs))) {
    return [];
  }
  let entries;
  try {
    entries = await fs.readdir(abs, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(`.${ext}`))
    .map((e) => `${toPosix(dir)}/${e.name}`);
}

/** Recursively read all files under a relative directory as { path (relative), content }. */
async function readDirFilesRecursive(
  projectDir: string,
  relDir: string,
): Promise<{ path: string; content: string }[]> {
  const out: { path: string; content: string }[] = [];
  const abs = path.join(projectDir, relDir);
  let entries;
  try {
    entries = await fs.readdir(abs, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const childRel = `${toPosix(relDir)}/${entry.name}`;
    if (entry.isDirectory()) {
      out.push(...(await readDirFilesRecursive(projectDir, childRel)));
    } else if (entry.isFile()) {
      out.push({ path: childRel, content: await fs.readFile(path.join(projectDir, childRel), 'utf8') });
    }
  }
  return out;
}

/** Directory of one-file-per-rule (frontmatter) artifacts. */
export async function discoverFrontmatterDir(
  projectDir: string,
  dir: string,
  ext: string,
  type: ArtifactType = 'rule',
): Promise<DiscoveredArtifact[]> {
  const rels = await listFilesWithExt(projectDir, dir, ext);
  const out: DiscoveredArtifact[] = [];
  for (const rel of rels) {
    const content = await fs.readFile(path.join(projectDir, rel), 'utf8');
    out.push({ slug: toSlug(rel), type, files: [{ path: rel, content }], sourceFiles: [rel] });
  }
  return out;
}

/** Directory of skill bundles: each subdirectory containing a SKILL.md is one skill. */
export async function discoverSkillBundles(
  projectDir: string,
  skillsDir: string,
): Promise<DiscoveredArtifact[]> {
  const abs = path.join(projectDir, skillsDir);
  if (!(await pathExists(abs))) {
    return [];
  }
  let entries;
  try {
    entries = await fs.readdir(abs, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: DiscoveredArtifact[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const skillDirRel = `${toPosix(skillsDir)}/${entry.name}`;
    const files = await readDirFilesRecursive(projectDir, skillDirRel);
    if (!files.some((f) => f.path.endsWith('SKILL.md'))) {
      continue;
    }
    out.push({
      slug: toSlug(entry.name),
      type: 'skill',
      files,
      sourceFiles: files.map((f) => f.path),
    });
  }
  return out;
}

/**
 * A single shared markdown file (AGENTS.md / GEMINI.md / CLAUDE.md / CONVENTIONS.md).
 * Each imwel block becomes one artifact (a synthesized single-block slice is fed to
 * parseExisting so it extracts exactly that block). A file with no imwel markers is
 * adopted whole as a single rule artifact.
 */
export async function discoverSingleMdBlocks(
  projectDir: string,
  fileName: string,
): Promise<DiscoveredArtifact[]> {
  const content = await readIfExists(path.join(projectDir, fileName));
  if (content == null) {
    return [];
  }
  const out: DiscoveredArtifact[] = [];

  const typedRe = /<!-- imwel:block:([\w-]+):(rule|skill) -->/g;
  for (const match of content.matchAll(typedRe)) {
    const slug = match[1]!;
    const kind = match[2] as 'rule' | 'skill';
    const blockId = `${slug}:${kind}`;
    const body = extractBlock(content, blockId) ?? '';
    out.push({
      slug,
      type: kind,
      files: [{ path: fileName, content: wrapBlock(blockId, body) }],
      sourceFiles: [fileName],
    });
  }

  const untypedRe = /<!-- imwel:block:([\w-]+) -->/g;
  for (const match of content.matchAll(untypedRe)) {
    const slug = match[1]!;
    const body = extractBlock(content, slug) ?? '';
    out.push({
      slug,
      type: 'rule',
      files: [{ path: fileName, content: wrapBlock(slug, body) }],
      sourceFiles: [fileName],
    });
  }

  if (out.length === 0 && content.trim()) {
    out.push({
      slug: toSlug(fileName),
      type: 'rule',
      files: [{ path: fileName, content }],
      sourceFiles: [fileName],
    });
  }
  return out;
}

/** Directory of prompt files, each adopted as a skill. */
export async function discoverPromptDir(
  projectDir: string,
  dir: string,
  ext: string,
): Promise<DiscoveredArtifact[]> {
  const rels = await listFilesWithExt(projectDir, dir, ext);
  const out: DiscoveredArtifact[] = [];
  for (const rel of rels) {
    const content = await fs.readFile(path.join(projectDir, rel), 'utf8');
    out.push({ slug: toSlug(rel), type: 'skill', files: [{ path: rel, content }], sourceFiles: [rel] });
  }
  return out;
}
