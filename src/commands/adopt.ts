import { existsSync } from 'node:fs';
import path from 'node:path';
import * as p from '@clack/prompts';
import { adapters } from '../adapters/index.js';
import {
  collectDrafts,
  consolidateExisting,
  writeConsolidated,
  type ConsolidatedArtifact,
} from '../core/adopt.js';
import { isInteractiveStdin, parseCsv } from '../core/cli-flags.js';
import { adoptedDir, draftsDir } from '../core/paths.js';
import { checkRuleHealth, type HealthIssue } from '../core/rule-health.js';
import { t } from '../locales/index.js';
import { formatHealthIssue } from './status.js';

export interface AdoptOptions {
  yes?: boolean;
  out?: string;
  tools?: string;
  /**
   * Adopt AI-drafted rules/skills from a drafts directory instead of tool-native
   * discovery. `true` (bare `--from`) uses the default `.imwel/drafts`; a string
   * overrides the directory.
   */
  from?: string | boolean;
}

export async function runAdopt(opts: AdoptOptions = {}): Promise<number> {
  p.intro(t('adopt.title'));
  const projectDir = process.cwd();

  if (opts.from !== undefined) {
    return runAdoptFromDrafts(projectDir, opts);
  }

  let adapterList = adapters;
  if (opts.tools) {
    const wanted = new Set(parseCsv(opts.tools));
    const supported = new Set(adapters.map((a) => a.id));
    const unknown = [...wanted].filter((id) => !supported.has(id));
    if (wanted.size === 0 || unknown.length > 0) {
      console.error(
        t('init.unknownTools', {
          tools: unknown.join(', ') || '(empty)',
          supported: [...supported].join(', '),
        }),
      );
      return 1;
    }
    adapterList = adapters.filter((a) => wanted.has(a.id));
  }

  const spinner = p.spinner();
  spinner.start(t('adopt.scanning'));
  const result = await consolidateExisting(projectDir, adapterList);
  spinner.stop(t('common.done'));

  if (result.artifacts.length === 0 && result.conflicts.length === 0) {
    console.log(t('adopt.noneFound'));
    p.outro(t('common.done'));
    return 0;
  }

  console.log(
    t('adopt.plan', {
      sources: result.sourceCount,
      artifacts: result.artifacts.length,
      conflicts: result.conflicts.length,
    }),
  );
  for (const conflict of result.conflicts) {
    console.warn(
      t('adopt.conflict', {
        type: conflict.type,
        slug: conflict.slug,
        tools: conflict.tools.join(', '),
        sources: conflict.sourceFiles.join(', '),
      }),
    );
  }
  if (result.conflicts.length > 0) {
    console.warn(t('adopt.conflict.hint'));
  }

  if (result.artifacts.length === 0) {
    console.log(t('adopt.allConflicts'));
    return 0;
  }

  const outDir = opts.out ? path.resolve(projectDir, opts.out) : adoptedDir(projectDir);

  if (!opts.yes) {
    if (!isInteractiveStdin()) {
      console.error(t('cli.nonInteractiveConfirmRequired'));
      return 1;
    }
    const confirm = await p.confirm({
      message: t('adopt.confirm', { count: result.artifacts.length, dir: outDir }),
      initialValue: true,
    });
    if (p.isCancel(confirm) || !confirm) {
      console.log(t('common.cancelled'));
      return 1;
    }
  }

  const written = await writeConsolidated(outDir, result.artifacts);
  for (const abs of written) {
    console.log(t('adopt.written', { path: abs }));
  }
  console.log(t('adopt.success', { count: written.length, dir: outDir }));
  console.log(t('adopt.nextSteps'));
  p.outro(t('common.done'));
  return 0;
}

async function runAdoptFromDrafts(projectDir: string, opts: AdoptOptions): Promise<number> {
  const source =
    typeof opts.from === 'string' && opts.from.length > 0
      ? path.resolve(projectDir, opts.from)
      : draftsDir(projectDir);

  const spinner = p.spinner();
  spinner.start(t('adopt.drafts.scanning'));
  const artifacts = await collectDrafts(source);
  spinner.stop(t('common.done'));

  if (artifacts.length === 0) {
    console.log(t('adopt.drafts.none', { dir: path.relative(projectDir, source) || source }));
    p.outro(t('common.done'));
    return 0;
  }

  const issues = draftHealthIssues(artifacts, source, projectDir);
  console.log(t('adopt.drafts.plan', { artifacts: artifacts.length, issues: issues.length }));
  for (const issue of issues) {
    console.warn(formatHealthIssue(issue));
  }

  const outDir = opts.out ? path.resolve(projectDir, opts.out) : adoptedDir(projectDir);

  if (!opts.yes) {
    if (!isInteractiveStdin()) {
      console.error(t('cli.nonInteractiveConfirmRequired'));
      return 1;
    }
    const message =
      issues.length > 0
        ? t('adopt.drafts.confirmIssues', {
            count: artifacts.length,
            issues: issues.length,
            dir: outDir,
          })
        : t('adopt.drafts.confirm', { count: artifacts.length, dir: outDir });
    const confirm = await p.confirm({ message, initialValue: issues.length === 0 });
    if (p.isCancel(confirm) || !confirm) {
      console.log(t('common.cancelled'));
      return 1;
    }
  }

  const written = await writeConsolidated(outDir, artifacts);
  for (const abs of written) {
    console.log(t('adopt.written', { path: abs }));
  }
  console.log(t('adopt.success', { count: written.length, dir: outDir }));
  console.log(t('adopt.nextSteps'));
  p.outro(t('common.done'));
  return 0;
}

/** Run the deterministic rule-health checks over draft artifacts (report-only). */
function draftHealthIssues(
  artifacts: ConsolidatedArtifact[],
  source: string,
  projectDir: string,
): HealthIssue[] {
  const files = artifacts.map((a) => ({
    path: path.relative(projectDir, path.join(source, a.sourceFiles[0]!)).split(path.sep).join('/'),
    content: a.canonicalContent,
  }));
  const exists = (ref: string, fromFileDir: string): boolean =>
    existsSync(path.join(projectDir, ref)) || existsSync(path.join(projectDir, fromFileDir, ref));
  return checkRuleHealth(files, exists);
}
