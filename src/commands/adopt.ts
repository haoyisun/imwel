import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import { adapters } from '../adapters/index.js';
import { collectDrafts, type ConsolidatedArtifact } from '../core/adopt.js';
import { applyRenderedFiles } from '../core/apply-files.js';
import type { Artifact } from '../core/artifact-types.js';
import { readBinding } from '../core/binding.js';
import { isInteractiveStdin, parseCsv } from '../core/cli-flags.js';
import { draftsDir } from '../core/paths.js';
import { pathExists } from '../core/fs-utils.js';
import { printPathConflicts } from '../core/print-conflicts.js';
import { detectTools, renderArtifacts } from '../core/render.js';
import { checkRuleHealth, type HealthIssue } from '../core/rule-health.js';
import { t } from '../locales/index.js';
import { formatHealthIssue } from './status.js';

export interface AdoptOptions {
  yes?: boolean;
  tools?: string;
  /**
   * Draft box to adopt. A string points at a specific box directory (containing
   * `rules/`/`skills/`); bare `--from` (or no flag) resolves under `.imwel/drafts/`,
   * supporting both the flat legacy layout and named per-batch boxes.
   */
  from?: string | boolean;
}

export async function runAdopt(opts: AdoptOptions = {}): Promise<number> {
  p.intro(t('adopt.title'));
  const projectDir = process.cwd();

  const source = await resolveDraftBox(projectDir, opts.from);
  if (source.kind === 'none') {
    console.log(t('adopt.drafts.none', { dir: source.dir }));
    p.outro(t('common.done'));
    return 0;
  }
  if (source.kind === 'ambiguous') {
    console.error(t('adopt.multipleBoxes', { boxes: source.boxes.join(', ') }));
    return 1;
  }

  const spinner = p.spinner();
  spinner.start(t('adopt.drafts.scanning'));
  const drafts = await collectDrafts(source.dir);
  spinner.stop(t('common.done'));

  if (drafts.length === 0) {
    console.log(t('adopt.drafts.none', { dir: path.relative(projectDir, source.dir) || source.dir }));
    p.outro(t('common.done'));
    return 0;
  }

  const tools = await resolveTools(projectDir, opts.tools);
  if (tools === null) {
    return 1;
  }

  const issues = draftHealthIssues(drafts, source.dir, projectDir);
  console.log(t('adopt.drafts.plan', { artifacts: drafts.length, issues: issues.length }));
  for (const issue of issues) {
    console.warn(formatHealthIssue(issue));
  }

  if (!opts.yes) {
    if (!isInteractiveStdin()) {
      console.error(t('cli.nonInteractiveConfirmRequired'));
      return 1;
    }
    const message =
      issues.length > 0
        ? t('adopt.drafts.confirmRenderIssues', {
            count: drafts.length,
            issues: issues.length,
            tools: tools.join(', '),
          })
        : t('adopt.drafts.confirmRender', { count: drafts.length, tools: tools.join(', ') });
    const confirm = await p.confirm({ message, initialValue: issues.length === 0 });
    if (p.isCancel(confirm) || !confirm) {
      console.log(t('common.cancelled'));
      return 1;
    }
  }

  const artifacts = draftsToArtifacts(drafts);
  const { files, conflicts } = renderArtifacts(artifacts, tools);
  if (conflicts.length) {
    printPathConflicts(conflicts);
    return 1;
  }

  // Adopted drafts are intentionally unmanaged (same as the first-party command
  // pack): no binding entry, no history commit — so status/sync/push never track them.
  await applyRenderedFiles(projectDir, files);
  for (const file of files) {
    console.log(t('adopt.written', { path: file.path }));
  }
  console.log(t('adopt.render.success', { count: drafts.length, tools: tools.join(', ') }));
  console.log(t('adopt.render.nextSteps'));
  p.outro(t('common.done'));
  return 0;
}

type DraftBox =
  | { kind: 'box'; dir: string }
  | { kind: 'none'; dir: string }
  | { kind: 'ambiguous'; boxes: string[] };

/**
 * Resolve which draft box to adopt. Supports an explicit `--from <path>`, the
 * flat legacy `.imwel/drafts/{rules,skills}` layout, and named per-batch boxes
 * under `.imwel/drafts/<box>/`.
 */
async function resolveDraftBox(projectDir: string, from: string | boolean | undefined): Promise<DraftBox> {
  if (typeof from === 'string' && from.length > 0) {
    return { kind: 'box', dir: path.resolve(projectDir, from) };
  }
  const root = draftsDir(projectDir);
  if (await hasDraftLayout(root)) {
    return { kind: 'box', dir: root };
  }
  const boxes = await listNamedBoxes(root);
  if (boxes.length === 0) {
    return { kind: 'none', dir: path.relative(projectDir, root) || root };
  }
  if (boxes.length === 1) {
    return { kind: 'box', dir: path.join(root, boxes[0]!) };
  }
  if (isInteractiveStdin()) {
    const selected = (await p.select({
      message: t('adopt.selectBox'),
      options: boxes.map((b) => ({ value: b, label: b })),
    })) as string;
    if (p.isCancel(selected)) {
      return { kind: 'none', dir: path.relative(projectDir, root) || root };
    }
    return { kind: 'box', dir: path.join(root, selected) };
  }
  return { kind: 'ambiguous', boxes };
}

async function hasDraftLayout(dir: string): Promise<boolean> {
  return (await pathExists(path.join(dir, 'rules'))) || (await pathExists(path.join(dir, 'skills')));
}

async function listNamedBoxes(root: string): Promise<string[]> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const boxes: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory() && (await hasDraftLayout(path.join(root, entry.name)))) {
      boxes.push(entry.name);
    }
  }
  return boxes.sort((a, b) => a.localeCompare(b));
}

/** Resolve render target tools: explicit `--tools`, else binding, else detected. */
async function resolveTools(projectDir: string, toolsFlag?: string): Promise<string[] | null> {
  const supported = new Set(adapters.map((a) => a.id));
  if (toolsFlag) {
    const tools = parseCsv(toolsFlag);
    const unknown = tools.filter((id) => !supported.has(id));
    if (tools.length === 0 || unknown.length > 0) {
      console.error(
        t('init.unknownTools', {
          tools: unknown.join(', ') || '(empty)',
          supported: [...supported].join(', '),
        }),
      );
      return null;
    }
    return tools;
  }
  const binding = await readBinding(projectDir);
  if (binding?.tools?.length) {
    return binding.tools;
  }
  const detected = await detectTools(projectDir);
  if (detected.length) {
    return detected;
  }
  console.error(t('adopt.needTools'));
  return null;
}

function draftsToArtifacts(drafts: ConsolidatedArtifact[]): Artifact[] {
  return drafts.map((draft) => ({
    sourcePath: draft.slug,
    type: draft.type,
    optional: false,
    canonicalContent: draft.canonicalContent,
    bundleFiles:
      draft.type === 'skill'
        ? [{ relativePath: 'SKILL.md', content: draft.canonicalContent }]
        : undefined,
  }));
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
