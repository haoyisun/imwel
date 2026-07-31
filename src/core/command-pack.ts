import fs from 'node:fs/promises';
import path from 'node:path';
import { adapters } from '../adapters/index.js';
import type { Artifact } from './artifact-types.js';
import type { RenderedFileWrite } from './apply-files.js';
import { applyRenderedFiles } from './apply-files.js';
import { loadFirstPartySkills } from './first-party-assets.js';
import { pathExists } from './fs-utils.js';
import { classifyProvenance } from './provenance.js';
import { renderArtifacts } from './render.js';
import type { PathConflict } from '../adapters/strategies/dedupe.js';

/**
 * Tools that previously received thin slash-command files alongside skills.
 * Cursor and Claude Code now surface skills via `/`, so those command files
 * duplicate the skill in the slash menu — reinstall removes them.
 */
const STALE_COMMAND_DIRS: Record<string, string> = {
  cursor: '.cursor/commands',
  'claude-code': '.claude/commands',
};

export interface CommandPackPlan {
  tools: string[];
  skills: Artifact[];
  files: RenderedFileWrite[];
  conflicts: PathConflict[];
  warningLocaleKeys: string[];
}

/** Build the set of command-pack files (backing skills only). */
export async function planCommandPack(tools: string[]): Promise<CommandPackPlan> {
  const skills = await loadFirstPartySkills();
  const skillResult = renderArtifacts(skills, tools);
  return {
    tools,
    skills,
    files: skillResult.files,
    conflicts: skillResult.conflicts,
    warningLocaleKeys: skillResult.warningLocaleKeys,
  };
}

/**
 * Install the command pack into the given tools. First-party assets are
 * intentionally unmanaged: no binding entry, no history commit — so
 * status/sync/push never track them. Also removes legacy thin command files
 * that would otherwise duplicate the skill in Cursor/Claude Code's `/` menu.
 */
export async function installCommandPack(
  projectDir: string,
  plan: CommandPackPlan,
): Promise<{ written: string[]; removed: string[] }> {
  const removed = await removeStaleThinCommands(projectDir, plan);
  await applyRenderedFiles(projectDir, plan.files);
  return {
    written: plan.files.map((f) => f.path),
    removed,
  };
}

/**
 * Delete formerly installed `imwel-*` thin command files for the pack members
 * being installed. Leaves author scaffold commands (`imwel-author`, `imwel-lint`)
 * and any non-imwel files untouched.
 */
export async function removeStaleThinCommands(
  projectDir: string,
  plan: Pick<CommandPackPlan, 'tools' | 'skills'>,
): Promise<string[]> {
  const memberNames = new Set(
    plan.skills.map((skill) => skill.sourcePath.split(/[/\\]/).pop() ?? skill.sourcePath),
  );
  const removed: string[] = [];
  for (const tool of plan.tools) {
    const dir = STALE_COMMAND_DIRS[tool];
    if (!dir) {
      continue;
    }
    const absDir = path.join(projectDir, ...dir.split('/'));
    if (!(await pathExists(absDir))) {
      continue;
    }
    for (const entry of await fs.readdir(absDir)) {
      if (!entry.endsWith('.md')) {
        continue;
      }
      const name = entry.slice(0, -'.md'.length);
      if (!memberNames.has(name)) {
        continue;
      }
      const rel = `${dir}/${entry}`;
      const abs = path.join(absDir, entry);
      let content: string | undefined;
      try {
        content = await fs.readFile(abs, 'utf8');
      } catch {
        continue;
      }
      if (classifyProvenance({ path: rel, content }).provenance !== 'MINE') {
        continue;
      }
      await fs.unlink(abs);
      removed.push(rel.replace(/\\/g, '/'));
    }
  }
  return removed.sort();
}

export function supportedToolIds(): Set<string> {
  return new Set(adapters.map((a) => a.id));
}

/** Exported for tests — adapters that used to get thin commands. */
export function staleCommandDirForTool(toolId: string): string | undefined {
  return STALE_COMMAND_DIRS[toolId];
}
