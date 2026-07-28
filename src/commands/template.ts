import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import { copyScaffold } from '../core/scaffold.js';
import { resolveLocale, type SupportedLocale } from '../core/locale.js';
import { detectHostCli, createRemoteRepo } from '../core/host-cli.js';
import { runGit } from '../core/git.js';
import { pathExists } from '../core/fs-utils.js';
import { isInteractiveStdin } from '../core/cli-flags.js';
import { generateTemplateFromProject } from '../core/template-from-project.js';
import { t } from '../locales/index.js';

export async function runTemplateInit(
  targetDir?: string,
  locale?: SupportedLocale,
  name?: string,
  options: { yes?: boolean; fromProject?: boolean; topic?: string } = {},
): Promise<number> {
  if (options.fromProject) {
    return runTemplateInitFromProject(targetDir, locale, options.topic);
  }
  const nonInteractive = !isInteractiveStdin() || Boolean(options.yes);
  if (!nonInteractive) {
    p.intro(t('template.init.title'));
  } else {
    console.log(t('template.init.title'));
  }

  let absDir: string;
  if (targetDir) {
    absDir = path.resolve(targetDir);
  } else if (nonInteractive) {
    console.error(t('cli.missingFlags', { flags: '--dir' }));
    return 1;
  } else {
    const dir = await p.text({
      message: t('template.init.prompt.dir'),
      defaultValue: process.cwd(),
    });
    if (p.isCancel(dir)) {
      console.log(t('common.cancelled'));
      return 1;
    }
    absDir = path.resolve(String(dir));
  }

  const entries = await fs.readdir(absDir).catch(() => [] as string[]);
  if (entries.length > 0 && !(entries.length === 1 && entries[0] === '.git')) {
    const nonEmpty = entries.some((e) => e !== '.git');
    if (nonEmpty) {
      console.error(t('template.init.exists', { path: absDir }));
      return 1;
    }
  }

  // The name only feeds `{{name}}` substitution and the optional remote-repo
  // creation, and defaults to the directory name — so don't prompt for it up
  // front; ask only when the user opts into creating a remote (below).
  let repoName = name ?? path.basename(absDir);

  let selectedLocale: SupportedLocale;
  if (locale) {
    selectedLocale = locale;
  } else if (nonInteractive) {
    selectedLocale = resolveLocale();
  } else {
    const prompted = (await p.select({
      message: t('template.init.prompt.locale'),
      options: [
        { value: 'en', label: 'English' },
        { value: 'zh-CN', label: '简体中文' },
      ],
      initialValue: resolveLocale(),
    })) as SupportedLocale;
    if (p.isCancel(prompted)) {
      console.log(t('common.cancelled'));
      return 1;
    }
    selectedLocale = prompted;
  }

  await copyScaffold(absDir, selectedLocale, { name: repoName }, {
    onSkip: (relativePath) => {
      console.log(t('template.init.skipExisting', { path: relativePath }));
    },
  });

  let initGit = false;
  if (!nonInteractive) {
    const confirmGit = await p.confirm({
      message: t('template.init.prompt.git'),
      initialValue: true,
    });
    if (!p.isCancel(confirmGit) && confirmGit) {
      initGit = true;
    }
  }

  if (initGit) {
    if (!(await pathExists(path.join(absDir, '.git')))) {
      await runGit(['init'], { cwd: absDir });
    }
    await runGit(['add', '.'], { cwd: absDir });
    await runGit(['commit', '-m', 'chore: initial imwel template scaffold'], { cwd: absDir });
  }

  if (!nonInteractive) {
    const hostCli = await detectHostCli();
    if (hostCli) {
      const createRemote = await p.confirm({
        message: t('template.init.prompt.remote', { cli: hostCli }),
        initialValue: false,
      });
      if (!p.isCancel(createRemote) && createRemote) {
        let remoteName = repoName;
        if (!name) {
          const promptedName = await p.text({
            message: t('template.init.prompt.name'),
            defaultValue: repoName,
          });
          if (!p.isCancel(promptedName) && String(promptedName).trim()) {
            remoteName = String(promptedName).trim();
          }
        }
        await createRemoteRepo(hostCli, remoteName);
      }
    }
  }

  console.log(t('template.init.success', { path: absDir }));
  if (!nonInteractive) {
    p.outro(t('common.done'));
  } else {
    console.log(t('common.done'));
  }
  return 0;
}

/**
 * `imwel template init --from-project`: harvest USER-owned tool artifacts in the
 * current project and generate a template-repo skeleton into a unique dir. The
 * semantic refinement (splitting projects, roles, README) is the job of the
 * `/imwel-create-template` skill; this is the deterministic substrate.
 */
async function runTemplateInitFromProject(
  targetDir: string | undefined,
  locale: SupportedLocale | undefined,
  topic: string | undefined,
): Promise<number> {
  const projectDir = process.cwd();
  console.log(t('template.fromProject.title'));

  const result = await generateTemplateFromProject(projectDir, {
    dir: targetDir ? path.resolve(targetDir) : undefined,
    topic,
    locale: locale ?? resolveLocale(),
  });

  for (const abs of result.writtenPaths) {
    console.log(t('skill.install.written', { path: path.relative(projectDir, abs) || abs }));
  }

  if (result.excluded.length) {
    console.log(t('template.fromProject.excluded', { count: result.excluded.length }));
    for (const item of result.excluded) {
      console.log(`  - ${item.path} (${t(item.reasonKey as 'provenance.reason.user')})`);
    }
  }

  if (result.conflicts.length) {
    for (const conflict of result.conflicts) {
      console.warn(
        t('template.fromProject.conflict', {
          slug: conflict.slug,
          tools: conflict.tools.join(', '),
        }),
      );
    }
  }

  if (result.artifacts.length === 0 && result.excluded.length === 0) {
    console.log(t('template.fromProject.empty'));
    return 0;
  }

  console.log(
    t('template.fromProject.success', {
      count: result.artifacts.length,
      path: path.relative(projectDir, result.genDir) || result.genDir,
    }),
  );
  console.log(t('template.fromProject.nextSteps', {
    path: path.relative(projectDir, result.genDir) || result.genDir,
  }));
  return 0;
}
