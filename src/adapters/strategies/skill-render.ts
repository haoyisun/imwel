import type { Artifact, BundleFile } from '../../core/artifact-types.js';
import type { ParsedExisting, RenderedFile } from '../types.js';
import { toSlug } from '../slug.js';
import {
  fromNativeFrontmatter,
  toNativeFrontmatter,
  toSemanticOverrides,
} from './overrides.js';
import {
  parseFrontmatter,
  serializeFrontmatter,
} from '../../core/frontmatter.js';
import { extractBlock } from '../../core/marked-blocks.js';
import { renderSingleMdRule, parseSingleMdBlockWithExtract } from './single-md-rules.js';

export function renderSkillBundle(
  artifact: Artifact,
  skillsPrefix: string,
): RenderedFile[] {
  if (artifact.type !== 'skill') {
    return [];
  }
  const skillName = artifact.sourcePath.split(/[/\\]/).pop() ?? 'skill';
  const prefix = skillsPrefix.replace(/\\/g, '/').replace(/\/$/, '');
  const files: RenderedFile[] = [];
  for (const bundleFile of artifact.bundleFiles ?? [
    { relativePath: 'SKILL.md', content: artifact.canonicalContent },
  ]) {
    files.push({
      path: `${prefix}/${skillName}/${bundleFile.relativePath}`.replace(/\\/g, '/'),
      content: bundleFile.content,
      merge: 'replace',
    });
  }
  return files;
}

export function parseSkillBundle(files: { path: string; content: string }[]): ParsedExisting {
  const skillFile = files.find((f) => f.path.endsWith('SKILL.md')) ?? files[0];
  const skillDir = skillFile ? posixDirname(skillFile.path) : '';
  const bundleFiles: BundleFile[] = files.map((f) => ({
    relativePath: relativizeToSkillDir(f.path, skillDir),
    content: f.content,
  }));
  return { canonicalContent: skillFile?.content ?? '', bundleFiles };
}

function posixDirname(p: string): string {
  const posix = p.replace(/\\/g, '/');
  const idx = posix.lastIndexOf('/');
  return idx < 0 ? '' : posix.slice(0, idx);
}

function relativizeToSkillDir(filePath: string, skillDir: string): string {
  const posix = filePath.replace(/\\/g, '/');
  if (skillDir && posix.startsWith(`${skillDir}/`)) {
    return posix.slice(skillDir.length + 1);
  }
  return posix;
}

/** R3: skill → prompts directory as a single markdown file. */
export function renderSkillAsPrompt(
  artifact: Artifact,
  promptsDir: string,
  ext = 'md',
): RenderedFile[] {
  if (artifact.type !== 'skill') {
    return [];
  }
  const slug = toSlug(artifact.sourcePath);
  const body =
    artifact.bundleFiles?.find((f) => f.relativePath === 'SKILL.md')?.content ??
    artifact.canonicalContent;
  return [
    {
      path: `${promptsDir.replace(/\\/g, '/')}/${slug}.${ext}`,
      content: body,
      merge: 'replace',
    },
  ];
}

/** R4: skill merged into a shared markdown file with typed skill block + warning. */
export function renderSkillAsAlwaysOnBlock(artifact: Artifact, filePath: string): RenderedFile[] {
  return renderSingleMdRule(artifact, filePath, 'skill');
}

export function parseSkillAsAlwaysOnBlock(
  files: { path: string; content: string }[],
  filePath: string,
): ParsedExisting {
  return parseSingleMdBlockWithExtract(files, filePath, extractBlock, 'skill');
}

/** R2 helpers: windsurf / cline / kiro on-demand defaults. */
export function windsurfOnDemandDefaults(preferModelDecision: boolean): Record<string, unknown> {
  return { trigger: preferModelDecision ? 'model_decision' : 'manual' };
}

export function clineOnDemandDefaults(): Record<string, unknown> {
  return { alwaysApply: false };
}

export function kiroOnDemandDefaults(preferAuto: boolean): Record<string, unknown> {
  return { inclusion: preferAuto ? 'auto' : 'manual' };
}

export function parsePromptFile(files: { path: string; content: string }[]): ParsedExisting {
  return { canonicalContent: files[0]?.content ?? '' };
}

export {
  toSemanticOverrides,
  toNativeFrontmatter,
  fromNativeFrontmatter,
  parseFrontmatter,
  serializeFrontmatter,
};
