import {
  parseFrontmatter,
  serializeFrontmatter,
} from '../../core/frontmatter.js';
import type { Artifact } from '../../core/artifact-types.js';
import type { ParsedExisting, RenderedFile } from '../types.js';
import { toSlug } from '../slug.js';
import {
  fromNativeFrontmatter,
  toNativeFrontmatter,
  toSemanticOverrides,
  type FrontmatterShape,
} from './overrides.js';

export interface FrontmatterRulesOptions {
  /** Directory relative to project root, e.g. `.trae/rules` or `.clinerules`. */
  dir: string;
  /** File extension without dot, e.g. `md` or `mdc`. */
  ext: string;
  shape: FrontmatterShape;
}

export function renderFrontmatterRule(
  artifact: Artifact,
  targetOverrides: Record<string, unknown> | undefined,
  options: FrontmatterRulesOptions,
): RenderedFile[] {
  if (artifact.type !== 'rule' && artifact.type !== 'agents') {
    return [];
  }
  const slug = toSlug(artifact.sourcePath);
  const semantic = toSemanticOverrides(targetOverrides);
  const frontmatter = toNativeFrontmatter(options.shape, semantic, slug);
  const content = serializeFrontmatter(
    artifact.canonicalContent,
    frontmatter,
    Object.keys(semantic).length ? (semantic as Record<string, unknown>) : undefined,
  );
  return [
    {
      path: `${options.dir.replace(/\\/g, '/')}/${slug}.${options.ext}`,
      content,
      merge: 'replace',
    },
  ];
}

export function parseFrontmatterRule(
  files: { path: string; content: string }[],
  options: FrontmatterRulesOptions,
): ParsedExisting {
  const file = files[0];
  if (!file) {
    return { canonicalContent: '' };
  }
  const parsed = parseFrontmatter(file.content);
  const targetOverrides = fromNativeFrontmatter(options.shape, parsed.frontmatter) as Record<
    string,
    unknown
  >;
  return {
    canonicalContent: parsed.body,
    targetOverrides,
  };
}

/** R2: skill as on-demand frontmatter rule in the same rules directory. */
export function renderFrontmatterSkillAsRule(
  artifact: Artifact,
  targetOverrides: Record<string, unknown> | undefined,
  options: FrontmatterRulesOptions,
  onDemandDefaults: Record<string, unknown>,
): RenderedFile[] {
  if (artifact.type !== 'skill') {
    return [];
  }
  const slug = toSlug(artifact.sourcePath);
  const semantic = {
    ...toSemanticOverrides(targetOverrides),
    ...toSemanticOverrides(onDemandDefaults),
    alwaysApply: false,
  };
  if (!semantic.description) {
    semantic.description = slug;
  }
  const frontmatter = toNativeFrontmatter(options.shape, semantic, slug);
  Object.assign(frontmatter, onDemandDefaults);
  const body =
    artifact.bundleFiles?.find((f) => f.relativePath === 'SKILL.md')?.content ??
    artifact.canonicalContent;
  const content = serializeFrontmatter(body, frontmatter, semantic as Record<string, unknown>);
  return [
    {
      path: `${options.dir.replace(/\\/g, '/')}/${slug}.${options.ext}`,
      content,
      merge: 'replace',
    },
  ];
}
