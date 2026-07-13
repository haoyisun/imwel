import path from 'node:path';
import { pathExists } from '../core/fs-utils.js';
import { extractBlock } from '../core/marked-blocks.js';
import type { Artifact } from '../core/artifact-types.js';
import type { Adapter, ParsedExisting, RenderedFile } from './types.js';
import { toSlug } from './slug.js';

export interface ClaudeCodeOverrides {
  imports?: string[];
}

function blockIdForArtifact(artifact: Artifact): string {
  return toSlug(artifact.sourcePath);
}

export const claudeCodeAdapter: Adapter = {
  id: 'claude-code',
  async detect(projectDir: string): Promise<boolean> {
    const claudeDir = path.join(projectDir, '.claude');
    const claudeMd = path.join(projectDir, 'CLAUDE.md');
    return (await pathExists(claudeDir)) || (await pathExists(claudeMd));
  },
  render(artifact, targetOverrides?: Record<string, unknown>): RenderedFile[] {
    if (artifact.type === 'skill') {
      const skillName = artifact.sourcePath.split('/').pop() ?? 'skill';
      const files: RenderedFile[] = [];
      for (const bundleFile of artifact.bundleFiles ?? [{ relativePath: 'SKILL.md', content: artifact.canonicalContent }]) {
        files.push({
          path: path.join('.claude', 'skills', skillName, bundleFile.relativePath).replace(/\\/g, '/'),
          content: bundleFile.content,
          merge: 'replace',
        });
      }
      return files;
    }
    if (artifact.type === 'rule' || artifact.type === 'agents') {
      const overrides = (targetOverrides ?? {}) as ClaudeCodeOverrides;
      let body = artifact.canonicalContent;
      if (overrides.imports?.length) {
        const imports = overrides.imports.map((p) => `@${p}`).join('\n');
        body = `${imports}\n\n${body}`;
      }
      return [
        {
          path: 'CLAUDE.md',
          content: body,
          merge: 'upsert-block',
          blockId: blockIdForArtifact(artifact),
        },
      ];
    }
    return [];
  },
  parseExisting(files): ParsedExisting {
    const claudeFile = files.find((f) => f.path === 'CLAUDE.md' || f.path.endsWith('CLAUDE.md'));
    if (!claudeFile) {
      const skillFile = files.find((f) => f.path.endsWith('SKILL.md'));
      return {
        canonicalContent: skillFile?.content ?? '',
      };
    }
    const blockIds = [...claudeFile.content.matchAll(/<!-- imwel:block:([\w-]+) -->/g)].map((m) => m[1]);
    const blockId = blockIds[0];
    const content = blockId ? extractBlock(claudeFile.content, blockId) ?? claudeFile.content : claudeFile.content;
    const importLines = content
      .split('\n')
      .filter((line) => line.startsWith('@'))
      .map((line) => line.replace(/^@/, '').trim());
    const body = content
      .split('\n')
      .filter((line) => !line.startsWith('@'))
      .join('\n')
      .trimStart();
    return {
      canonicalContent: body,
      targetOverrides: importLines.length ? { imports: importLines } : {},
    };
  },
};
