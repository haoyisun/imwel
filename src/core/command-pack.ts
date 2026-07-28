import { adapters, getAdapter } from '../adapters/index.js';
import type { FirstPartyCommand } from '../adapters/types.js';
import type { Artifact } from './artifact-types.js';
import type { RenderedFileWrite } from './apply-files.js';
import { applyRenderedFiles } from './apply-files.js';
import { loadFirstPartySkills } from './first-party-assets.js';
import { parseFrontmatter } from './frontmatter.js';
import { renderArtifacts } from './render.js';
import type { PathConflict } from '../adapters/strategies/dedupe.js';

/** Derive the command-pack command list from the loaded first-party skills. */
export function buildFirstPartyCommands(skills: Artifact[]): FirstPartyCommand[] {
  return skills.map((skill) => {
    const name = skill.sourcePath.split(/[/\\]/).pop() ?? skill.sourcePath;
    const description = parseFrontmatter(skill.canonicalContent).frontmatter.description;
    const intent =
      typeof description === 'string' && description.trim() ? description.trim() : name;
    return { name, skillName: name, intent };
  });
}

/**
 * Render command thin entries for each tool that supports commands. Tools
 * without a command mechanism are returned in `skillOnlyTools` (they still get
 * the backing skill via `renderArtifacts`).
 */
export function renderCommandEntries(
  commands: FirstPartyCommand[],
  tools: string[],
): { files: RenderedFileWrite[]; commandTools: string[]; skillOnlyTools: string[] } {
  const files: RenderedFileWrite[] = [];
  const commandTools: string[] = [];
  const skillOnlyTools: string[] = [];
  for (const tool of tools) {
    const adapter = getAdapter(tool);
    if (!adapter) {
      continue;
    }
    if (adapter.supportsCommands && adapter.renderCommand) {
      commandTools.push(tool);
      for (const command of commands) {
        for (const rendered of adapter.renderCommand(command)) {
          files.push({ ...rendered, sourceAdapterId: tool });
        }
      }
    } else {
      skillOnlyTools.push(tool);
    }
  }
  return { files, commandTools, skillOnlyTools };
}

export interface CommandPackPlan {
  skills: Artifact[];
  commands: FirstPartyCommand[];
  files: RenderedFileWrite[];
  conflicts: PathConflict[];
  warningLocaleKeys: string[];
  commandTools: string[];
  skillOnlyTools: string[];
}

/** Build the full set of command-pack files (backing skills + command entries). */
export async function planCommandPack(tools: string[]): Promise<CommandPackPlan> {
  const skills = await loadFirstPartySkills();
  const commands = buildFirstPartyCommands(skills);
  const skillResult = renderArtifacts(skills, tools);
  const { files: commandFiles, commandTools, skillOnlyTools } = renderCommandEntries(
    commands,
    tools,
  );
  return {
    skills,
    commands,
    files: [...skillResult.files, ...commandFiles],
    conflicts: skillResult.conflicts,
    warningLocaleKeys: skillResult.warningLocaleKeys,
    commandTools,
    skillOnlyTools,
  };
}

/**
 * Install the command pack into the given tools. First-party assets are
 * intentionally unmanaged: no binding entry, no history commit — so
 * status/sync/push never track them.
 */
export async function installCommandPack(
  projectDir: string,
  plan: CommandPackPlan,
): Promise<string[]> {
  await applyRenderedFiles(projectDir, plan.files);
  return plan.files.map((f) => f.path);
}

export function supportedToolIds(): Set<string> {
  return new Set(adapters.map((a) => a.id));
}
