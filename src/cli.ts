#!/usr/bin/env node
import { Command } from 'commander';
import { resolveLocale } from './core/locale.js';
import { setActiveLocale } from './locales/index.js';
import { runPassiveCheckIfDue } from './core/passive-check.js';
import { runDoctor } from './commands/doctor.js';
import {
  runRemoteAdd,
  runRemoteList,
  runRemoteRemove,
  runRemoteSet,
} from './commands/remote.js';
import { runTemplateInit } from './commands/template.js';
import { runInit, type InitOptions } from './commands/init.js';
import { runAdopt, type AdoptOptions } from './commands/adopt.js';
import { runScan, type ScanOptions } from './commands/scan.js';
import { runSkillInstall, type SkillInstallOptions } from './commands/skill.js';
import { runSync, type SyncOptions } from './commands/sync.js';
import { runStatus } from './commands/status.js';
import { runRollback, type RollbackOptions } from './commands/rollback.js';
import { runPush, type PushOptions } from './commands/push.js';
import { runPropose, type ProposeOptions } from './commands/propose.js';
import { runLint } from './commands/lint.js';
import type { SupportedLocale } from './core/locale.js';

async function main(): Promise<void> {
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
      if (sub !== 'sync' && sub !== 'status') {
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
    .action(async (opts: { strict?: boolean }) => {
      process.exit(await runLint({ strict: Boolean(opts.strict) }));
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
    .option('--dir <path>', 'Target directory')
    .option('--locale <locale>', 'Scaffold locale')
    .option('--name <name>', 'Repository name')
    .option('-y, --yes', 'Skip confirmation prompts (non-interactive defaults)')
    .action(async (opts: { dir?: string; locale?: string; name?: string; yes?: boolean }) => {
      process.exit(
        await runTemplateInit(
          opts.dir,
          opts.locale as SupportedLocale | undefined,
          opts.name,
          { yes: Boolean(opts.yes) },
        ),
      );
    });

  program
    .command('init')
    .option('-y, --yes', 'Skip confirmation prompts (does not invent selections)')
    .option('--tools <csv>', 'Comma-separated target tool ids')
    .option('--remote <alias>', 'Remote alias')
    .option('--branch <name>', 'Branch name')
    .option('--project <name>', 'Manifest project name')
    .option('--optional <csv>', 'Comma-separated optional artifact source paths to install')
    .option('--no-optional', 'Install no optional artifacts')
    .action(
      async (opts: {
        yes?: boolean;
        tools?: string;
        remote?: string;
        branch?: string;
        project?: string;
        optional?: string;
        noOptional?: boolean;
      }) => {
        const initOpts: InitOptions = {
          yes: opts.yes,
          tools: opts.tools,
          remote: opts.remote,
          branch: opts.branch,
          project: opts.project,
          optional: opts.noOptional ? false : opts.optional,
        };
        process.exit(await runInit(initOpts));
      },
    );

  program
    .command('adopt')
    .description('Consolidate existing scattered tool-native rules into canonical artifacts')
    .option('-y, --yes', 'Skip write confirmation')
    .option('--out <path>', 'Output directory (default .imwel/adopted)')
    .option('--tools <csv>', 'Limit to specific tool ids')
    .option('--from [dir]', 'Adopt AI drafts from a directory (default .imwel/drafts)')
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
    .command('propose <file>')
    .description('Register a local file as a new artifact candidate')
    .option('-y, --yes', 'Skip confirmation prompts')
    .option('--remote <alias>', 'Target remote alias')
    .option('--project <name>', 'Target manifest project')
    .option('--type <type>', 'Artifact type: rule, skill, or agents')
    .option('--optional', 'Treat as optional artifact')
    .option('--required', 'Treat as required artifact')
    .option('--tool <id>', 'Source tool adapter for reverse-render')
    .action(async (file: string, opts: ProposeOptions) => {
      process.exit(await runPropose(file, opts));
    });

  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
