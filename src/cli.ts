#!/usr/bin/env node
import { Command } from 'commander';
import { resolveLocale } from './core/locale.js';
import { error as outputError } from './core/cli-output.js';
import { setActiveLocale, t } from './locales/index.js';
import {
  runPassiveCheckIfDue,
  shouldRunPassiveCheck,
} from './core/passive-check.js';
import { runDoctor } from './commands/doctor.js';
import {
  runRemoteAdd,
  runRemoteList,
  runRemoteRemove,
  runRemoteSet,
} from './commands/remote.js';
import { runTemplateInit } from './commands/template.js';
import { runInit, type InitOptions } from './commands/init.js';
import { runModules, type ModulesOptions } from './commands/modules.js';
import { runTools, type ToolsOptions } from './commands/tools.js';
import { runAdopt, type AdoptOptions } from './commands/adopt.js';
import { runScan, type ScanOptions } from './commands/scan.js';
import { runSkillInstall, type SkillInstallOptions } from './commands/skill.js';
import { runSync, type SyncOptions } from './commands/sync.js';
import { runStatus } from './commands/status.js';
import { runRollback, type RollbackOptions } from './commands/rollback.js';
import { runPush, type PushOptions } from './commands/push.js';
import { runPropose, type ProposeOptions } from './commands/propose.js';
import { runLint } from './commands/lint.js';
import { runBindingShow, type BindingShowOptions } from './commands/binding.js';
import type { SupportedLocale } from './core/locale.js';

async function main(): Promise<void> {
  const langIndex = process.argv.indexOf('--lang');
  setActiveLocale(resolveLocale(langIndex >= 0 ? process.argv[langIndex + 1] : undefined));
  const program = new Command();
  program
    .name('imwel')
    .description('Git-native CLI for AI coding rules and skills')
    .option('--lang <locale>', 'Interface locale (en, zh-CN)')
    .hook('preAction', async (thisCommand) => {
      const lang = thisCommand.opts<{ lang?: string }>().lang;
      const locale = resolveLocale(lang);
      setActiveLocale(locale);
      const sub = thisCommand.args[0];
      if (shouldRunPassiveCheck(sub)) {
        await runPassiveCheckIfDue();
      }
    });

  program.command('doctor').action(async () => {
    process.exit(await runDoctor());
  });

  program
    .command('lint')
    .description('Lint a template repository for install-breaking and style issues')
    .option('--strict', 'Fail on warnings as well as errors')
    .option('--no-auto-activate-hooks', 'Do not auto-activate .githooks/ when detected unset')
    .action(async (opts: { strict?: boolean; autoActivateHooks?: boolean }) => {
      process.exit(
        await runLint({
          strict: Boolean(opts.strict),
          autoActivateHooks: opts.autoActivateHooks !== false,
        }),
      );
    });

  const remote = program.command('remote').description('Manage template remotes');
  remote
    .command('add <urlOrAlias> [url]')
    .description('Add a remote: `add <url>` (alias derived) or `add <alias> <url>`')
    .option('--as <alias>', 'Explicit local alias (with the single-URL form)')
    .option('--direct-push', 'Allow direct push to bound branch')
    .action(
      async (
        urlOrAlias: string,
        url: string | undefined,
        opts: { as?: string; directPush?: boolean },
      ) => {
        process.exit(
          await runRemoteAdd({
            urlOrAlias,
            url,
            as: opts.as,
            directPush: Boolean(opts.directPush),
          }),
        );
      },
    );
  remote.command('list').action(async () => {
    process.exit(await runRemoteList());
  });
  remote
    .command('remove <alias>')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (alias: string, opts: { yes?: boolean }) => {
      process.exit(await runRemoteRemove(alias, Boolean(opts.yes)));
    });
  remote
    .command('set <alias>')
    .option('--direct-push [value]', 'Enable or disable direct push')
    .action(async (alias: string, opts: { directPush?: string | boolean }) => {
      let directPush: boolean | undefined;
      if (opts.directPush === true || opts.directPush === 'true') {
        directPush = true;
      } else if (opts.directPush === 'false') {
        directPush = false;
      }
      process.exit(await runRemoteSet(alias, directPush));
    });

  const template = program.command('template').description('Template repository commands');
  template
    .command('init')
    .option('--dir <path>', 'Target directory (output dir for --from-project)')
    .option('--locale <locale>', 'Scaffold locale')
    .option('--name <name>', 'Repository name')
    .option('--from-project', 'Generate a template repo from the current project\'s existing tool artifacts')
    .option('--topic <slug>', 'Topic slug for the generated template dir name (--from-project)')
    .option('-y, --yes', 'Skip confirmation prompts (non-interactive defaults)')
    .action(
      async (opts: {
        dir?: string;
        locale?: string;
        name?: string;
        fromProject?: boolean;
        topic?: string;
        yes?: boolean;
      }) => {
        process.exit(
          await runTemplateInit(
            opts.dir,
            opts.locale as SupportedLocale | undefined,
            opts.name,
            {
              yes: Boolean(opts.yes),
              fromProject: Boolean(opts.fromProject),
              topic: opts.topic,
            },
          ),
        );
      },
    );

  program
    .command('init')
    .option('-y, --yes', 'Skip confirmation prompts (does not invent selections)')
    .option('--tools <csv>', 'Comma-separated target tool ids')
    .option('--remote <alias>', 'Remote alias')
    .option('--branch <name>', 'Branch name')
    .option('--project <name>', 'Writable manifest project name (role: project; at most one)')
    .option('--module <csv>', 'Comma-separated read-only module names (role: shared) to install')
    .option('--optional <csv>', 'Comma-separated optional artifact source paths to install')
    .option('--no-optional', 'Install no optional artifacts')
    .option('--command-pack', 'Install the imwel command pack (extract/audit/...) into selected tools')
    .option('--no-command-pack', 'Do not install the imwel command pack')
    .action(
      async (opts: {
        yes?: boolean;
        tools?: string;
        remote?: string;
        branch?: string;
        project?: string;
        module?: string;
        optional?: string;
        noOptional?: boolean;
        commandPack?: boolean;
      }) => {
        const initOpts: InitOptions = {
          yes: opts.yes,
          tools: opts.tools,
          remote: opts.remote,
          branch: opts.branch,
          project: opts.project,
          module: opts.module,
          optional: opts.noOptional ? false : opts.optional,
          commandPack: opts.commandPack,
        };
        process.exit(await runInit(initOpts));
      },
    );

  program
    .command('modules')
    .description('Add, remove, or freeze read-only modules for this binding')
    .option('-y, --yes', 'Skip confirmation prompts (does not invent selections)')
    .option('--add <csv>', 'Comma-separated module names to install')
    .option('--remove <csv>', 'Comma-separated module names to uninstall')
    .option('--freeze <csv>', 'Comma-separated installed module names to freeze')
    .option('--unfreeze <csv>', 'Comma-separated installed module names to unfreeze')
    .action(async (opts: ModulesOptions) => {
      process.exit(await runModules(opts));
    });

  program
    .command('tools')
    .description(t('tools.description'))
    .option('-y, --yes', t('tools.help.yes'))
    .option('--add <csv>', t('tools.help.add'))
    .option('--remove <csv>', t('tools.help.remove'))
    .option('--delete-output', t('tools.help.deleteOutput'))
    .action(async (opts: ToolsOptions) => {
      process.exit(await runTools(opts));
    });

  program
    .command('adopt')
    .description('Render reviewed AI drafts from a draft box into your tools (unmanaged)')
    .option('-y, --yes', 'Skip write confirmation')
    .option('--tools <csv>', 'Render target tool ids (default: binding tools, else detected)')
    .option('--from [box]', 'Draft box to adopt (default .imwel/drafts; a path selects a named box)')
    .action(async (opts: AdoptOptions) => {
      process.exit(await runAdopt(opts));
    });

  program
    .command('scan')
    .description('Deterministically fingerprint the project into .imwel/fingerprint.yaml')
    .option('--out <path>', 'Output path (default .imwel/fingerprint.yaml)')
    .action(async (opts: ScanOptions) => {
      process.exit(await runScan(opts));
    });

  const skill = program.command('skill').description('Install imwel first-party skills into your tools');
  skill
    .command('install')
    .description('Render imwel first-party skills (e.g. imwel-extract) into selected tools')
    .option('--tools <csv>', 'Comma-separated target tool ids')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (opts: SkillInstallOptions) => {
      process.exit(await runSkillInstall(opts));
    });

  program
    .command('sync')
    .option('-y, --yes', 'Skip apply confirmation')
    .option('--continue', 'Continue sync after manual conflict resolution')
    .action(async (opts: SyncOptions) => {
      process.exit(await runSync(opts));
    });

  program.command('status').action(async () => {
    process.exit(await runStatus());
  });

  const binding = program.command('binding').description(t('binding.description'));
  binding
    .command('show')
    .option('--json', t('binding.help.json'))
    .action(async (opts: BindingShowOptions) => {
      process.exit(await runBindingShow(opts));
    });

  program
    .command('rollback')
    .option('-y, --yes', 'Skip confirmation prompts')
    .option('--to <sha>', 'History commit SHA to restore')
    .action(async (opts: RollbackOptions) => {
      process.exit(await runRollback(opts));
    });

  program
    .command('push')
    .option('-y, --yes', 'Skip confirmation prompts')
    .option('--all', 'Select all push candidates')
    .option('--message <msg>', 'Commit message')
    .action(async (opts: PushOptions) => {
      process.exit(await runPush(opts));
    });

  program
    .command('propose [file]')
    .description('Manage single-target contribution tracking (no file → interactive multiselect)')
    .option('-y, --yes', 'Skip confirmation prompts')
    .option('--remote <alias>', 'Target remote alias')
    .option('--project <name>', 'Target manifest project')
    .option('--type <type>', 'Artifact type: rule, skill, or agents')
    .option('--optional', 'Treat as optional artifact')
    .option('--required', 'Treat as required artifact')
    .option('--tool <id>', 'Source tool adapter for reverse-render')
    .action(async (file: string | undefined, opts: ProposeOptions) => {
      process.exit(await runPropose(file, opts));
    });

  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  outputError(message);
  process.exit(1);
});
