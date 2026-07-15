import type { Artifact } from '../../core/artifact-types.js';
import type { ParsedExisting, RenderedFile } from '../types.js';
import { toSlug } from '../slug.js';

export type BlockKind = 'rule' | 'skill';

/** Typed block id: `slug:rule` / `slug:skill`. Untyped `slug` remains valid for Claude Code. */
export function typedBlockId(slug: string, kind: BlockKind): string {
  return `${slug}:${kind}`;
}

export function parseBlockKind(blockId: string): { slug: string; kind: BlockKind } {
  const match = blockId.match(/^([\w-]+):(rule|skill)$/);
  if (match) {
    return { slug: match[1]!, kind: match[2] as BlockKind };
  }
  return { slug: blockId, kind: 'rule' };
}

export function renderSingleMdRule(
  artifact: Artifact,
  filePath: string,
  kind: BlockKind = 'rule',
  bodyTransform?: (body: string) => string,
): RenderedFile[] {
  if (kind === 'rule' && artifact.type !== 'rule' && artifact.type !== 'agents') {
    return [];
  }
  if (kind === 'skill' && artifact.type !== 'skill') {
    return [];
  }
  const slug = toSlug(artifact.sourcePath);
  let body =
    kind === 'skill'
      ? (artifact.bundleFiles?.find((f) => f.relativePath === 'SKILL.md')?.content ??
        artifact.canonicalContent)
      : artifact.canonicalContent;
  if (bodyTransform) {
    body = bodyTransform(body);
  }
  return [
    {
      path: filePath,
      content: body,
      merge: 'upsert-block',
      blockId: typedBlockId(slug, kind),
      warningLocaleKey: kind === 'skill' ? 'adapter.skill.r4Warning' : undefined,
    },
  ];
}

export function parseSingleMdBlockWithExtract(
  files: { path: string; content: string }[],
  filePath: string,
  extractBlock: (content: string, id: string) => string | null,
  preferredKind?: BlockKind,
): ParsedExisting {
  const file = files.find((f) => f.path === filePath || f.path.endsWith(filePath));
  if (!file) {
    return { canonicalContent: '' };
  }
  const typedRe = /<!-- imwel:block:([\w-]+):(rule|skill) -->/g;
  const untypedRe = /<!-- imwel:block:([\w-]+) -->/g;
  const typed = [...file.content.matchAll(typedRe)];
  if (typed.length) {
    const match =
      (preferredKind ? typed.find((m) => m[2] === preferredKind) : typed[0]) ?? typed[0]!;
    const blockId = `${match[1]}:${match[2]}`;
    return {
      canonicalContent: extractBlock(file.content, blockId) ?? file.content,
      targetOverrides: {},
    };
  }
  const untyped = [...file.content.matchAll(untypedRe)];
  if (untyped.length) {
    const blockId = untyped[0]![1]!;
    return {
      canonicalContent: extractBlock(file.content, blockId) ?? file.content,
      targetOverrides: {},
    };
  }
  return { canonicalContent: file.content, targetOverrides: {} };
}
