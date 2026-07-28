import * as p from '@clack/prompts';
import { adapters } from '../adapters/index.js';
import { exitIfMissingFlags, isInteractiveStdin, parseCsv } from '../core/cli-flags.js';
import { installCommandPack, planCommandPack, supportedToolIds } from '../core/command-pack.js';
import { t } from '../locales/index.js';

export interface SkillInstallOptions {
  tools?: string;
  yes?: boolean;
}

export async function runSkillInstall(opts: SkillInstallOptions = {}): Promise<number> {
  p.intro(t('skill.install.title'));
  const projectDir = process.cwd();
  const nonInteractive = !isInteractiveStdin() || Boolean(opts.tools) || Boolean(opts.yes);

  const supported = supportedToolIds();
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

  const code = await installCommandPackWithFeedback(projectDir, tools, {
    yes: opts.yes,
    confirm: true,
  });
  if (code === 0) {
    p.outro(t('common.done'));
  }
  return code;
}

/**
 * Shared command-pack install used by `imwel skill install` and `imwel init`.
 * Loads assets, prints the plan, optionally confirms, applies, and reports which
 * tools got commands vs skill-only.
 */
export async function installCommandPackWithFeedback(
  projectDir: string,
  tools: string[],
  opts: { yes?: boolean; confirm?: boolean } = {},
): Promise<number> {
  let plan;
  try {
    plan = await planCommandPack(tools);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
  if (plan.skills.length === 0) {
    console.error(t('skill.install.none'));
    return 1;
  }
  if (plan.conflicts.length) {
    for (const conflict of plan.conflicts) {
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
      skills: plan.skills.length,
      files: plan.files.length,
      tools: tools.join(', '),
    }),
  );
  if (plan.skillOnlyTools.length) {
    console.log(t('commandPack.skillOnly', { tools: plan.skillOnlyTools.join(', ') }));
  }

  if (opts.confirm && !opts.yes && isInteractiveStdin()) {
    const confirm = await p.confirm({ message: t('skill.install.confirm'), initialValue: true });
    if (p.isCancel(confirm) || !confirm) {
      console.log(t('common.cancelled'));
      return 1;
    }
  }

  const written = await installCommandPack(projectDir, plan);
  for (const path of written) {
    console.log(t('skill.install.written', { path }));
  }
  for (const key of plan.warningLocaleKeys) {
    console.warn(t(key as 'adapter.skill.r4Warning'));
  }
  console.log(t('skill.install.success', { count: plan.skills.length }));
  console.log(t('skill.install.nextSteps'));
  return 0;
}
