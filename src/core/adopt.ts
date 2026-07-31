import fs from 'node:fs/promises';
import path from 'node:path';
import type { Adapter } from '../adapters/types.js';
import type { ArtifactType, BundleFile } from './artifact-types.js';
import { mergeMultiToolParseResults, type ToolParseResult } from './push.js';
import { classifyProvenance } from './provenance.js';
import { assertBundlePathsSafe } from './propose-validate.js';

export interface ConsolidatedArtifact {
  slug: string;
  type: ArtifactType;
  canonicalContent: string;
  targetOverrides: Record<string, Record<string, unknown>>;
  tools: string[];
  sourceFiles: string[];
  /** For `type=skill`: full bundle (SKILL.md + accompanying files), or undefined. */
  bundleFiles?: BundleFile[];
}

export interface ConsolidateConflict {
  slug: string;
  type: ArtifactType;
  tools: string[];
  sourceFiles: string[];
}

export interface ConsolidateResult {
  artifacts: ConsolidatedArtifact[];
  conflicts: ConsolidateConflict[];
  /** Total number of distinct source files discovered on disk. */
  sourceCount: number;
  /** Tool ids that contributed at least one discovered artifact. */
  toolIds: string[];
  /** Source files skipped because they are not USER-owned (MINE/FOREIGN). */
  excluded: { path: string; reasonKey: string }[];
}

export interface ConsolidateOptions {
  /**
   * When true, skip artifacts whose source is not the user's own (imwel-installed
   * or third-party-tool artifacts), using `artifact-provenance`. Used by
   * `template init --from-project` so generated templates never sweep in
   * imwel's command pack or other tooling's files.
   */
  onlyUser?: boolean;
}

interface Group {
  slug: string;
  type: ArtifactType;
  results: ToolParseResult[];
  sourceFiles: Set<string>;
}

/**
 * Discover existing tool-native rule/skill files across all adapters and group
 * them by logical artifact (type + slug). Discovery only finds/groups files;
 * parsing stays in each adapter's `parseExisting`. Does not require a binding or
 * remote, and never modifies the scanned files (read-only).
 */
export async function consolidateExisting(
  projectDir: string,
  adapterList: Adapter[],
  options: ConsolidateOptions = {},
): Promise<ConsolidateResult> {
  const groups = new Map<string, Group>();
  const allSourceFiles = new Set<string>();
  const toolIds = new Set<string>();
  const excluded: { path: string; reasonKey: string }[] = [];

  for (const adapter of adapterList) {
    if (!adapter.discoverExisting) {
      continue;
    }
    const discovered = await adapter.discoverExisting(projectDir);
    for (const item of discovered) {
      const parsed = adapter.parseExisting(item.files);
      if (!parsed.canonicalContent.trim()) {
        continue;
      }
      if (options.onlyUser) {
        const ref = {
          path: item.sourceFiles[0] ?? item.files[0]?.path ?? item.slug,
          content: item.files[0]?.content,
        };
        const result = classifyProvenance(ref);
        if (result.provenance !== 'USER') {
          excluded.push({ path: ref.path, reasonKey: result.reasonKey });
          continue;
        }
      }
      toolIds.add(adapter.id);
      item.sourceFiles.forEach((s) => allSourceFiles.add(s));
      const key = `${item.type}:${item.slug}`;
      const group = groups.get(key) ?? {
        slug: item.slug,
        type: item.type,
        results: [],
        sourceFiles: new Set<string>(),
      };
      group.results.push({
        tool: adapter.id,
        canonicalContent: parsed.canonicalContent,
        targetOverrides: parsed.targetOverrides,
        ...(parsed.bundleFiles ? { bundleFiles: parsed.bundleFiles } : {}),
      });
      item.sourceFiles.forEach((s) => group.sourceFiles.add(s));
      groups.set(key, group);
    }
  }

  const artifacts: ConsolidatedArtifact[] = [];
  const conflicts: ConsolidateConflict[] = [];

  for (const group of groups.values()) {
    const merged = mergeMultiToolParseResults(group.results);
    if (!merged.ok) {
      conflicts.push({
        slug: group.slug,
        type: group.type,
        tools: merged.tools,
        sourceFiles: [...group.sourceFiles],
      });
      continue;
    }
    artifacts.push({
      slug: group.slug,
      type: group.type,
      canonicalContent: merged.canonicalContent,
      targetOverrides: merged.targetOverrides,
      tools: group.results.map((r) => r.tool),
      sourceFiles: [...group.sourceFiles],
      ...(merged.bundleFiles ? { bundleFiles: merged.bundleFiles } : {}),
    });
  }

  return {
    artifacts,
    conflicts,
    sourceCount: allSourceFiles.size,
    toolIds: [...toolIds],
    excluded,
  };
}

/**
 * Collect AI-drafted rules/skills from a drafts directory (default `.imwel/drafts/`)
 * as consolidation candidates. Drafts are already canonical (agents.md-flavored
 * Markdown), so no adapter parsing or cross-tool merge is needed — each draft maps
 * directly to one artifact. Returns an empty array when the directory is absent or
 * has no drafts. Read-only.
 */
export async function collectDrafts(draftsDir: string): Promise<ConsolidatedArtifact[]> {
  const artifacts: ConsolidatedArtifact[] = [];

  const rules = await readDir(path.join(draftsDir, 'rules'));
  for (const entry of rules) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue;
    }
    const rel = `rules/${entry.name}`;
    const content = await fs.readFile(path.join(draftsDir, 'rules', entry.name), 'utf8');
    if (!content.trim()) {
      continue;
    }
    artifacts.push(draftArtifact('rule', entry.name.slice(0, -'.md'.length), content, rel));
  }

  const skillDirs = await readDir(path.join(draftsDir, 'skills'));
  for (const entry of skillDirs) {
    if (!entry.isDirectory()) {
      continue;
    }
    const skillDirAbs = path.join(draftsDir, 'skills', entry.name);
    const bundleFiles = await readDraftBundleFiles(skillDirAbs);
    const skillMd = bundleFiles.find((f) => f.relativePath === 'SKILL.md');
    if (!skillMd || !skillMd.content.trim()) {
      continue;
    }
    artifacts.push(draftArtifact('skill', entry.name, skillMd.content, `skills/${entry.name}/SKILL.md`, bundleFiles));
  }

  return artifacts.sort((a, b) => `${a.type}:${a.slug}`.localeCompare(`${b.type}:${b.slug}`));
}

async function readDir(dir: string): Promise<import('node:fs').Dirent[]> {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function draftArtifact(
  type: ArtifactType,
  slug: string,
  canonicalContent: string,
  sourceFile: string,
  bundleFiles?: BundleFile[],
): ConsolidatedArtifact {
  return {
    slug,
    type,
    canonicalContent,
    targetOverrides: {},
    tools: [],
    sourceFiles: [sourceFile],
    ...(bundleFiles ? { bundleFiles } : {}),
  };
}

/** Recursively read draft skill bundle files as { relativePath, content }, paths relative to the skill dir. */
async function readDraftBundleFiles(dirAbs: string): Promise<BundleFile[]> {
  const out: BundleFile[] = [];
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dirAbs, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const childAbs = path.join(dirAbs, entry.name);
    if (entry.isDirectory()) {
      for (const nested of await readDraftBundleFiles(childAbs)) {
        out.push({ relativePath: `${entry.name}/${nested.relativePath}`.replace(/\\/g, '/'), content: nested.content });
      }
    } else if (entry.isFile()) {
      out.push({ relativePath: entry.name, content: await fs.readFile(childAbs, 'utf8') });
    }
  }
  return out;
}

/** Output-relative path for a consolidated artifact's primary file, using template-repo layout. */
export function outputPathFor(artifact: ConsolidatedArtifact): string {
  if (artifact.type === 'skill') {
    return `skills/${artifact.slug}/SKILL.md`;
  }
  return `rules/${artifact.slug}.md`;
}

/** Write consolidated artifacts under `outDir`, including skill bundle files. Returns absolute paths written. */
export async function writeConsolidated(
  outDir: string,
  artifacts: ConsolidatedArtifact[],
): Promise<string[]> {
  const written: string[] = [];
  for (const artifact of artifacts) {
    if (artifact.type === 'skill' && artifact.bundleFiles && artifact.bundleFiles.length > 0) {
      assertBundlePathsSafe(artifact.bundleFiles);
      for (const bundleFile of artifact.bundleFiles) {
        const rel = path.posix.join('skills', artifact.slug, bundleFile.relativePath);
        const abs = path.join(outDir, rel);
        await fs.mkdir(path.dirname(abs), { recursive: true });
        await fs.writeFile(abs, ensureTrailingNewline(bundleFile.content), 'utf8');
        written.push(abs);
      }
      continue;
    }
    const abs = path.join(outDir, outputPathFor(artifact));
    await fs.mkdir(path.dirname(abs), { recursive: true });
    const content = artifact.canonicalContent.endsWith('\n')
      ? artifact.canonicalContent
      : `${artifact.canonicalContent}\n`;
    await fs.writeFile(abs, content, 'utf8');
    written.push(abs);
  }
  return written;
}

function ensureTrailingNewline(content: string): string {
  return content.endsWith('\n') ? content : `${content}\n`;
}
