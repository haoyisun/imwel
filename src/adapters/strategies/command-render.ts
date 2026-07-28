import type { FirstPartyCommand, RenderedFile } from '../types.js';

/**
 * Render a first-party command thin entry as a markdown file into `commandsDir`.
 * The body stays intentionally short: it carries the `generatedBy: imwel`
 * provenance marker and points the tool at the backing skill, which holds the
 * real logic.
 */
export function renderCommandFile(command: FirstPartyCommand, commandsDir: string): RenderedFile[] {
  const dir = commandsDir.replace(/\\/g, '/').replace(/\/$/, '');
  const content = [
    '---',
    'generatedBy: imwel',
    '---',
    `# /${command.name}`,
    '',
    command.intent,
    '',
    `Load and follow the \`${command.skillName}\` skill, then complete the user's request.`,
    '',
  ].join('\n');
  return [{ path: `${dir}/${command.name}.md`, content, merge: 'replace' }];
}
