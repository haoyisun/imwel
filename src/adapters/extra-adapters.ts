import path from 'node:path';
import { pathExists } from '../core/fs-utils.js';
import type { Adapter } from './types.js';
import {
  parseFrontmatterRule,
  renderFrontmatterRule,
  renderFrontmatterSkillAsRule,
} from './strategies/frontmatter-rules.js';
import { parseSkillBundle, renderSkillBundle } from './strategies/skill-render.js';
import { parseGithubInstructions, renderGithubInstructions } from './strategies/github-instructions.js';
import {
  parseSingleMdBlockWithExtract,
  renderSingleMdRule,
} from './strategies/single-md-rules.js';
import { extractBlock } from '../core/marked-blocks.js';
import {
  clineOnDemandDefaults,
  kiroOnDemandDefaults,
  parsePromptFile,
  renderSkillAsPrompt,
  windsurfOnDemandDefaults,
} from './strategies/skill-render.js';
import {
  discoverFrontmatterDir,
  discoverPromptDir,
  discoverSingleMdBlocks,
  discoverSkillBundles,
} from './strategies/discover.js';
import type { DiscoveredArtifact } from './types.js';

function detectAny(projectDir: string, candidates: string[]): Promise<boolean> {
  return Promise.any(
    candidates.map(async (c) => {
      if (await pathExists(path.join(projectDir, c))) {
        return true;
      }
      throw new Error('missing');
    }),
  ).catch(() => false);
}

export const traeAdapter: Adapter = {
  id: 'trae',
  async detect(projectDir) {
    return pathExists(path.join(projectDir, '.trae'));
  },
  render(artifact, targetOverrides) {
    if (artifact.type === 'skill') {
      return renderSkillBundle(artifact, '.trae/skills');
    }
    return renderFrontmatterRule(artifact, targetOverrides, {
      dir: '.trae/rules',
      ext: 'md',
      shape: 'standard',
    });
  },
  parseExisting(files) {
    if (files.some((f) => f.path.includes('/skills/'))) {
      return parseSkillBundle(files);
    }
    return parseFrontmatterRule(files, { dir: '.trae/rules', ext: 'md', shape: 'standard' });
  },
  async discoverExisting(projectDir): Promise<DiscoveredArtifact[]> {
    return [
      ...(await discoverFrontmatterDir(projectDir, '.trae/rules', 'md')),
      ...(await discoverSkillBundles(projectDir, '.trae/skills')),
    ];
  },
};

export const qoderAdapter: Adapter = {
  id: 'qoder',
  async detect(projectDir) {
    return pathExists(path.join(projectDir, '.qoder'));
  },
  render(artifact, targetOverrides) {
    if (artifact.type === 'skill') {
      return renderSkillBundle(artifact, '.qoder/skills');
    }
    return renderFrontmatterRule(artifact, targetOverrides, {
      dir: '.qoder/rules',
      ext: 'md',
      shape: 'standard',
    });
  },
  parseExisting(files) {
    if (files.some((f) => f.path.includes('/skills/'))) {
      return parseSkillBundle(files);
    }
    return parseFrontmatterRule(files, { dir: '.qoder/rules', ext: 'md', shape: 'standard' });
  },
  async discoverExisting(projectDir): Promise<DiscoveredArtifact[]> {
    return [
      ...(await discoverFrontmatterDir(projectDir, '.qoder/rules', 'md')),
      ...(await discoverSkillBundles(projectDir, '.qoder/skills')),
    ];
  },
};

export const codexAdapter: Adapter = {
  id: 'codex',
  async detect(projectDir) {
    return pathExists(path.join(projectDir, '.codex'));
  },
  render(artifact) {
    if (artifact.type === 'skill') {
      return renderSkillBundle(artifact, '.agents/skills');
    }
    return renderSingleMdRule(artifact, 'AGENTS.md', 'rule');
  },
  parseExisting(files) {
    if (files.some((f) => f.path.includes('.agents/skills/') || f.path.includes('/skills/'))) {
      return parseSkillBundle(files);
    }
    return parseSingleMdBlockWithExtract(files, 'AGENTS.md', extractBlock, 'rule');
  },
  async discoverExisting(projectDir): Promise<DiscoveredArtifact[]> {
    return [
      ...(await discoverSingleMdBlocks(projectDir, 'AGENTS.md')),
      ...(await discoverSkillBundles(projectDir, '.agents/skills')),
    ];
  },
};

export const opencodeAdapter: Adapter = {
  id: 'opencode',
  async detect(projectDir) {
    return detectAny(projectDir, ['.opencode', 'opencode.json']);
  },
  render(artifact) {
    if (artifact.type === 'skill') {
      return renderSkillBundle(artifact, '.opencode/skills');
    }
    return renderSingleMdRule(artifact, 'AGENTS.md', 'rule');
  },
  parseExisting(files) {
    if (files.some((f) => f.path.includes('.opencode/skills/'))) {
      return parseSkillBundle(files);
    }
    return parseSingleMdBlockWithExtract(files, 'AGENTS.md', extractBlock, 'rule');
  },
  async discoverExisting(projectDir): Promise<DiscoveredArtifact[]> {
    return [
      ...(await discoverSingleMdBlocks(projectDir, 'AGENTS.md')),
      ...(await discoverSkillBundles(projectDir, '.opencode/skills')),
    ];
  },
};

export const windsurfAdapter: Adapter = {
  id: 'windsurf',
  async detect(projectDir) {
    return detectAny(projectDir, ['.windsurf', '.windsurfrules']);
  },
  render(artifact, targetOverrides) {
    const opts = { dir: '.windsurf/rules', ext: 'md', shape: 'windsurf' as const };
    if (artifact.type === 'skill') {
      return renderFrontmatterSkillAsRule(
        artifact,
        targetOverrides,
        opts,
        windsurfOnDemandDefaults(true),
      );
    }
    return renderFrontmatterRule(artifact, targetOverrides, opts);
  },
  parseExisting(files) {
    return parseFrontmatterRule(files, {
      dir: '.windsurf/rules',
      ext: 'md',
      shape: 'windsurf',
    });
  },
  discoverExisting(projectDir) {
    return discoverFrontmatterDir(projectDir, '.windsurf/rules', 'md');
  },
};

export const continueAdapter: Adapter = {
  id: 'continue',
  async detect(projectDir) {
    return pathExists(path.join(projectDir, '.continue'));
  },
  render(artifact, targetOverrides) {
    if (artifact.type === 'skill') {
      return renderSkillAsPrompt(artifact, '.continue/prompts', 'md');
    }
    return renderFrontmatterRule(artifact, targetOverrides, {
      dir: '.continue/rules',
      ext: 'md',
      shape: 'standard',
    });
  },
  parseExisting(files) {
    if (files.some((f) => f.path.includes('/prompts/'))) {
      return parsePromptFile(files);
    }
    return parseFrontmatterRule(files, {
      dir: '.continue/rules',
      ext: 'md',
      shape: 'standard',
    });
  },
  async discoverExisting(projectDir): Promise<DiscoveredArtifact[]> {
    return [
      ...(await discoverFrontmatterDir(projectDir, '.continue/rules', 'md')),
      ...(await discoverPromptDir(projectDir, '.continue/prompts', 'md')),
    ];
  },
};

export const clineAdapter: Adapter = {
  id: 'cline',
  async detect(projectDir) {
    return detectAny(projectDir, ['.clinerules']);
  },
  render(artifact, targetOverrides) {
    const opts = { dir: '.clinerules', ext: 'md', shape: 'cline' as const };
    if (artifact.type === 'skill') {
      return renderFrontmatterSkillAsRule(
        artifact,
        targetOverrides,
        opts,
        clineOnDemandDefaults(),
      );
    }
    return renderFrontmatterRule(artifact, targetOverrides, opts);
  },
  parseExisting(files) {
    return parseFrontmatterRule(files, { dir: '.clinerules', ext: 'md', shape: 'cline' });
  },
  discoverExisting(projectDir) {
    return discoverFrontmatterDir(projectDir, '.clinerules', 'md');
  },
};

export const kiroAdapter: Adapter = {
  id: 'kiro',
  async detect(projectDir) {
    return pathExists(path.join(projectDir, '.kiro'));
  },
  render(artifact, targetOverrides) {
    const opts = { dir: '.kiro/steering', ext: 'md', shape: 'kiro' as const };
    if (artifact.type === 'skill') {
      return renderFrontmatterSkillAsRule(
        artifact,
        targetOverrides,
        opts,
        kiroOnDemandDefaults(true),
      );
    }
    return renderFrontmatterRule(artifact, targetOverrides, opts);
  },
  parseExisting(files) {
    return parseFrontmatterRule(files, { dir: '.kiro/steering', ext: 'md', shape: 'kiro' });
  },
  discoverExisting(projectDir) {
    return discoverFrontmatterDir(projectDir, '.kiro/steering', 'md');
  },
};

export const zcodeAdapter: Adapter = {
  id: 'zcode',
  async detect(projectDir) {
    return pathExists(path.join(projectDir, '.zcode'));
  },
  render(artifact) {
    if (artifact.type === 'skill') {
      return renderSkillBundle(artifact, '.zcode/skills');
    }
    return renderSingleMdRule(artifact, 'AGENTS.md', 'rule');
  },
  parseExisting(files) {
    if (files.some((f) => f.path.includes('.zcode/skills/'))) {
      return parseSkillBundle(files);
    }
    return parseSingleMdBlockWithExtract(files, 'AGENTS.md', extractBlock, 'rule');
  },
  async discoverExisting(projectDir): Promise<DiscoveredArtifact[]> {
    return [
      ...(await discoverSingleMdBlocks(projectDir, 'AGENTS.md')),
      ...(await discoverSkillBundles(projectDir, '.zcode/skills')),
    ];
  },
};

export const geminiCliAdapter: Adapter = {
  id: 'gemini-cli',
  async detect(projectDir) {
    return detectAny(projectDir, ['.gemini', 'GEMINI.md']);
  },
  render(artifact) {
    if (artifact.type === 'skill') {
      return renderSingleMdRule(artifact, 'GEMINI.md', 'skill');
    }
    return renderSingleMdRule(artifact, 'GEMINI.md', 'rule');
  },
  parseExisting(files) {
    const skill = parseSingleMdBlockWithExtract(files, 'GEMINI.md', extractBlock, 'skill');
    if (skill.canonicalContent) {
      // Prefer skill only when typed skill markers exist; else rule.
      const file = files.find((f) => f.path.endsWith('GEMINI.md'));
      if (file?.content.includes(':skill -->')) {
        return skill;
      }
    }
    return parseSingleMdBlockWithExtract(files, 'GEMINI.md', extractBlock, 'rule');
  },
  discoverExisting(projectDir) {
    return discoverSingleMdBlocks(projectDir, 'GEMINI.md');
  },
};

export const copilotAdapter: Adapter = {
  id: 'copilot',
  async detect(projectDir) {
    return detectAny(projectDir, [
      '.github/copilot-instructions.md',
      '.github/instructions',
    ]);
  },
  render(artifact, targetOverrides) {
    if (artifact.type === 'skill') {
      return renderSkillAsPrompt(artifact, '.github/prompts', 'prompt.md');
    }
    return renderGithubInstructions(artifact, targetOverrides);
  },
  parseExisting(files) {
    if (files.some((f) => f.path.includes('/prompts/'))) {
      return parsePromptFile(files);
    }
    return parseGithubInstructions(files);
  },
  async discoverExisting(projectDir): Promise<DiscoveredArtifact[]> {
    return [
      ...(await discoverSingleMdBlocks(projectDir, '.github/copilot-instructions.md')),
      ...(await discoverFrontmatterDir(projectDir, '.github/instructions', 'instructions.md')),
      ...(await discoverPromptDir(projectDir, '.github/prompts', 'prompt.md')),
    ];
  },
};

export const aiderAdapter: Adapter = {
  id: 'aider',
  async detect(projectDir) {
    return pathExists(path.join(projectDir, '.aider.conf.yml'));
  },
  render(artifact) {
    if (artifact.type === 'skill') {
      const skillBlocks = renderSingleMdRule(artifact, 'CONVENTIONS.md', 'skill');
      return [
        ...skillBlocks,
        {
          path: '.aider.conf.yml',
          content: 'CONVENTIONS.md',
          merge: 'ensure-yaml-list',
          blockId: 'read',
        },
      ];
    }
    if (artifact.type === 'rule' || artifact.type === 'agents') {
      return [
        ...renderSingleMdRule(artifact, 'CONVENTIONS.md', 'rule'),
        {
          path: '.aider.conf.yml',
          content: 'CONVENTIONS.md',
          merge: 'ensure-yaml-list',
          blockId: 'read',
        },
      ];
    }
    return [];
  },
  parseExisting(files) {
    const conventions = files.find((f) => f.path.endsWith('CONVENTIONS.md'));
    if (!conventions) {
      return { canonicalContent: '' };
    }
    return parseSingleMdBlockWithExtract([conventions], 'CONVENTIONS.md', extractBlock);
  },
  discoverExisting(projectDir) {
    return discoverSingleMdBlocks(projectDir, 'CONVENTIONS.md');
  },
};
