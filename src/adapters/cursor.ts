import path from 'node:path';
import { pathExists } from '../core/fs-utils.js';
import {
  extractImwelOverrides,
  parseFrontmatter,
  serializeFrontmatter,
} from '../core/frontmatter.js';
import type { Artifact } from '../core/artifact-types.js';
import type { Adapter, ParsedExisting, RenderedFile } from './types.js';
import { toSlug } from './slug.js';
import { discoverFrontmatterDir } from './strategies/discover.js';

export interface CursorOverrides {
  globs?: string[];
  alwaysApply?: boolean;
  description?: string;
}

export const cursorAdapter: Adapter = {
  id: 'cursor',
  async detect(projectDir: string): Promise<boolean> {
    return pathExists(path.join(projectDir, '.cursor'));
  },
  render(artifact, targetOverrides?: Record<string, unknown>): RenderedFile[] {
    if (artifact.type !== 'rule') {
      return [];
    }
    const overrides = (targetOverrides ?? {}) as CursorOverrides;
    const slug = toSlug(artifact.sourcePath);
    const frontmatter: Record<string, unknown> = {
      description: overrides.description ?? slug,
    };
    if (overrides.globs?.length) {
      frontmatter.globs = overrides.globs;
    }
    if (overrides.alwaysApply !== undefined) {
      frontmatter.alwaysApply = overrides.alwaysApply;
    }
    const content = serializeFrontmatter(
      artifact.canonicalContent,
      frontmatter,
      overrides as Record<string, unknown>,
    );
    return [{ path: `.cursor/rules/${slug}.mdc`, content, merge: 'replace' }];
  },
  parseExisting(files): ParsedExisting {
    const file = files[0];
    if (!file) {
      return { canonicalContent: '' };
    }
    const parsed = parseFrontmatter(file.content);
    const targetOverrides = extractImwelOverrides(parsed.frontmatter);
    if (parsed.frontmatter.globs) {
      targetOverrides.globs = parsed.frontmatter.globs;
    }
    if (parsed.frontmatter.alwaysApply !== undefined) {
      targetOverrides.alwaysApply = parsed.frontmatter.alwaysApply;
    }
    if (parsed.frontmatter.description) {
      targetOverrides.description = parsed.frontmatter.description;
    }
    return {
      canonicalContent: parsed.body,
      targetOverrides,
    };
  },
  discoverExisting(projectDir) {
    return discoverFrontmatterDir(projectDir, '.cursor/rules', 'mdc');
  },
};
