import * as p from '@clack/prompts';
import { adapters } from '../adapters/index.js';
import { applyRenderedFiles } from '../core/apply-files.js';
import { exitIfMissingFlags, isInteractiveStdin, parseCsv } from '../core/cli-flags.js';
import { loadFirstPartySkills } from '../core/first-party-assets.js';
import { renderArtifacts } from '../core/render.js';
import { t } from '../locales/index.js';

export interface SkillInstallOptions {
  tools?: string;
  yes?: boolean;
}

export async function runSkillInstall(opts: SkillInstallOptions = {}): Promise<number> {
  p.intro(t('skill.install.title'));
  const projectDir = process.cwd();
  const nonInteractive = !isInteractiveStdin() || Boolean(opts.tools) || Boolean(opts.yes);

  let skills;
  try {
    skills = await loadFirstPartySkills();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
  if (skills.length === 0) {
    console.error(t('skill.install.none'));
    return 1;
  }

  const supported = new Set(adapters.map((a) => a.id));
  let tools: string[];
  if (nonInteractive) {
    const missing = exitIfMissingFlags({ '--tools': opts.tools });
    if (missing !== null) {
      return missing;
    }
    tools = parseCsv(opts.tools);
    const unknown = tools.filter((id) => !supported.has(id));
    if (tools.length === 0 || unknown.length > 0) {
      console.error(
        t('init.unknownTools', {
          tools: unknown.join(', ') || '(empty)',
          supported: [...supported].join(', '),
        }),
      );
      return 1;
    }
  } else {
    const detected = await Promise.all(
      adapters.map(async (adapter) => ({
        value: adapter.id,
        label: t(`tool.${adapter.id}` as 'tool.cursor'),
        detected: await adapter.detect(projectDir),
      })),
    );
    const selected = (await p.multiselect({
      message: t('skill.install.prompt.tools'),
      options: detected.map((d) => ({ value: d.value, label: d.label })),
      required: true,
    })) as string[];
    if (p.isCancel(selected) || selected.length === 0) {
      console.error(t('init.noTools'));
      return 1;
    }
    tools = selected;
  }

  const { files, conflicts, warningLocaleKeys } = renderArtifacts(skills, tools);
  if (conflicts.length) {
    for (const conflict of conflicts) {
      console.error(
        t('adapter.pathConflict', {
          path: conflict.path,
          tools: conflict.adapterIds.join(', '),
        }),
      );
    }
    console.error(t('adapter.pathConflict.hint'));
    return 1;
  }

  console.log(
    t('skill.install.plan', {
      skills: skills.length,
      files: files.length,
      tools: tools.join(', '),
    }),
  );

  if (!opts.yes && isInteractiveStdin()) {
    const confirm = await p.confirm({ message: t('skill.install.confirm'), initialValue: true });
    if (p.isCancel(confirm) || !confirm) {
      console.log(t('common.cancelled'));
      return 1;
    }
  }

  // First-party assets are intentionally unmanaged: no history commit, no binding
  // entry — so status/sync/push never track them.
  await applyRenderedFiles(projectDir, files);
  for (const file of files) {
    console.log(t('skill.install.written', { path: file.path }));
  }
  for (const key of warningLocaleKeys) {
    console.warn(t(key as 'adapter.skill.r4Warning'));
  }
  console.log(t('skill.install.success', { count: skills.length }));
  console.log(t('skill.install.nextSteps'));
  p.outro(t('common.done'));
  return 0;
}
