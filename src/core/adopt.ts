import fs from 'node:fs/promises';
import path from 'node:path';
import type { Adapter } from '../adapters/types.js';
import type { ArtifactType } from './artifact-types.js';
import { mergeMultiToolParseResults, type ToolParseResult } from './push.js';

export interface ConsolidatedArtifact {
  slug: string;
  type: ArtifactType;
  canonicalContent: string;
  targetOverrides: Record<string, Record<string, unknown>>;
  tools: string[];
  sourceFiles: string[];
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
): Promise<ConsolidateResult> {
  const groups = new Map<string, Group>();
  const allSourceFiles = new Set<string>();
  const toolIds = new Set<string>();

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
    });
  }

  return {
    artifacts,
    conflicts,
    sourceCount: allSourceFiles.size,
    toolIds: [...toolIds],
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
    const skillMd = path.join(draftsDir, 'skills', entry.name, 'SKILL.md');
    let content: string;
    try {
      content = await fs.readFile(skillMd, 'utf8');
    } catch {
      continue;
    }
    if (!content.trim()) {
      continue;
    }
    artifacts.push(draftArtifact('skill', entry.name, content, `skills/${entry.name}/SKILL.md`));
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
): ConsolidatedArtifact {
  return { slug, type, canonicalContent, targetOverrides: {}, tools: [], sourceFiles: [sourceFile] };
}

/** Output-relative path for a consolidated artifact, using template-repo layout. */
export function outputPathFor(artifact: ConsolidatedArtifact): string {
  if (artifact.type === 'skill') {
    return `skills/${artifact.slug}/SKILL.md`;
  }
  return `rules/${artifact.slug}.md`;
}

/** Write consolidated artifacts under `outDir`. Returns absolute paths written. */
export async function writeConsolidated(
  outDir: string,
  artifacts: ConsolidatedArtifact[],
): Promise<string[]> {
  const written: string[] = [];
  for (const artifact of artifacts) {
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
