import * as p from '@clack/prompts';
import { adapters } from '../adapters/index.js';
import { readBinding, type Binding } from '../core/binding.js';
import { exitIfMissingFlags, isInteractiveStdin, parseCsv } from '../core/cli-flags.js';
import { error as outputError, info, success, warn } from '../core/cli-output.js';
import { installCommandPack, planCommandPack, supportedToolIds } from '../core/command-pack.js';
import { t } from '../locales/index.js';

export interface SkillInstallOptions {
  tools?: string;
  yes?: boolean;
}

interface SkillToolMultiselectOptions {
  message: string;
  options: Array<{ value: string; label: string }>;
  initialValues?: string[];
  required: boolean;
}

export interface SkillToolPrompts {
  confirm(options: { message: string; initialValue: boolean }): Promise<boolean | symbol>;
  multiselect(options: SkillToolMultiselectOptions): Promise<string[] | symbol>;
}

const defaultSkillToolPrompts: SkillToolPrompts = {
  confirm: async (options) => p.confirm(options),
  multiselect: async (options) => p.multiselect(options) as Promise<string[] | symbol>,
};

export async function selectSkillInstallTools(
  projectDir: string,
  binding: Binding | null,
  prompts: SkillToolPrompts = defaultSkillToolPrompts,
): Promise<string[] | null> {
  const supported = supportedToolIds();
  const bindingTools = binding?.tools ?? [];
  const validBindingTools = bindingTools.filter((id) => supported.has(id));
  const invalidBindingTools = bindingTools.filter((id) => !supported.has(id));

  if (invalidBindingTools.length > 0) {
    warn(t('skill.install.binding.invalidTools', { tools: invalidBindingTools.join(', ') }));
  } else if (binding && validBindingTools.length > 0) {
    const reuse = await prompts.confirm({
      message: t('skill.install.binding.reuse', { tools: validBindingTools.join(', ') }),
      initialValue: true,
    });
    if (p.isCancel(reuse)) {
      return null;
    }
    if (reuse) {
      return validBindingTools;
    }
  }

  const detected = await Promise.all(
    adapters.map(async (adapter) => ({
      value: adapter.id,
      label: t(`tool.${adapter.id}` as 'tool.cursor'),
      detected: await adapter.detect(projectDir),
    })),
  );
  const multiselectOptions: SkillToolMultiselectOptions = {
    message: t('skill.install.prompt.tools'),
    options: detected.map((d) => ({ value: d.value, label: d.label })),
    required: true,
  };
  if (binding) {
    multiselectOptions.initialValues = validBindingTools;
  }
  const selected = await prompts.multiselect(multiselectOptions);
  if (p.isCancel(selected)) {
    return null;
  }
  return selected;
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
      outputError(
        t('init.unknownTools', {
          tools: unknown.join(', ') || '(empty)',
          supported: [...supported].join(', '),
        }),
      );
      return 1;
    }
  } else {
    const binding = await readBinding(projectDir);
    const selected = await selectSkillInstallTools(projectDir, binding);
    if (!selected || selected.length === 0) {
      outputError(t('init.noTools'));
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
    outputError(t('common.error', {
      message: error instanceof Error ? error.message : String(error),
    }));
    return 1;
  }
  if (plan.skills.length === 0) {
    outputError(t('skill.install.none'));
    return 1;
  }
  if (plan.conflicts.length) {
    for (const conflict of plan.conflicts) {
      outputError(
        t('adapter.pathConflict', {
          path: conflict.path,
          tools: conflict.adapterIds.join(', '),
        }),
      );
    }
    outputError(t('adapter.pathConflict.hint'));
    return 1;
  }

  info(
    t('skill.install.plan', {
      skills: plan.skills.length,
      files: plan.files.length,
      tools: tools.join(', '),
    }),
  );
  if (plan.skillOnlyTools.length) {
    info(t('commandPack.skillOnly', { tools: plan.skillOnlyTools.join(', ') }));
  }

  if (opts.confirm && !opts.yes && isInteractiveStdin()) {
    const confirm = await p.confirm({ message: t('skill.install.confirm'), initialValue: true });
    if (p.isCancel(confirm) || !confirm) {
      info(t('common.cancelled'));
      return 1;
    }
  }

  const written = await installCommandPack(projectDir, plan);
  for (const path of written) {
    info(t('skill.install.written', { path }));
  }
  for (const key of plan.warningLocaleKeys) {
    warn(t(key as 'adapter.skill.r4Warning'));
  }
  success(t('skill.install.success', { count: plan.skills.length }));
  info(t('skill.install.nextSteps'));
  return 0;
}
