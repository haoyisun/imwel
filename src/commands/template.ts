import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import { copyScaffold } from '../core/scaffold.js';
import { resolveLocale, type SupportedLocale } from '../core/locale.js';
import { detectHostCli, createRemoteRepo } from '../core/host-cli.js';
import { runGit } from '../core/git.js';
import { pathExists } from '../core/fs-utils.js';
import { isInteractiveStdin } from '../core/cli-flags.js';
import { t } from '../locales/index.js';

export async function runTemplateInit(
  targetDir?: string,
  locale?: SupportedLocale,
  name?: string,
  options: { yes?: boolean } = {},
): Promise<number> {
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
