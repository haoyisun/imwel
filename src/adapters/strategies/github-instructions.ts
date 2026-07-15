import type { Artifact } from '../../core/artifact-types.js';
import type { ParsedExisting, RenderedFile } from '../types.js';
import { toSlug } from '../slug.js';
import { toSemanticOverrides } from './overrides.js';
import { parseFrontmatterRule, renderFrontmatterRule } from './frontmatter-rules.js';
import { renderSingleMdRule, parseSingleMdBlockWithExtract } from './single-md-rules.js';
import { extractBlock } from '../../core/marked-blocks.js';

const COPILOT_ROOT = '.github/copilot-instructions.md';
const COPILOT_INSTRUCTIONS_DIR = '.github/instructions';

/**
 * A4: no globs → upsert into copilot-instructions.md;
 * with globs → path-specific *.instructions.md with applyTo.
 */
export function renderGithubInstructions(
  artifact: Artifact,
  targetOverrides?: Record<string, unknown>,
): RenderedFile[] {
  if (artifact.type !== 'rule' && artifact.type !== 'agents') {
    return [];
  }
  const semantic = toSemanticOverrides(targetOverrides);
  if (semantic.globs?.length) {
    const rendered = renderFrontmatterRule(artifact, targetOverrides, {
      dir: COPILOT_INSTRUCTIONS_DIR,
      ext: 'md',
      shape: 'copilot-applyTo',
    });
    return rendered.map((f) => ({
      ...f,
      path: `${COPILOT_INSTRUCTIONS_DIR}/${toSlug(artifact.sourcePath)}.instructions.md`,
    }));
  }
  return renderSingleMdRule(artifact, COPILOT_ROOT, 'rule');
}

export function parseGithubInstructions(
  files: { path: string; content: string }[],
): ParsedExisting {
  const pathSpecific = files.find(
    (f) => f.path.includes('/instructions/') && f.path.endsWith('.instructions.md'),
  );
  if (pathSpecific) {
    return parseFrontmatterRule([pathSpecific], {
      dir: COPILOT_INSTRUCTIONS_DIR,
      ext: 'instructions.md',
      shape: 'copilot-applyTo',
    });
  }
  return parseSingleMdBlockWithExtract(files, COPILOT_ROOT, extractBlock, 'rule');
}
