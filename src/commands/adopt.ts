import path from 'node:path';
import * as p from '@clack/prompts';
import { adapters } from '../adapters/index.js';
import { consolidateExisting, writeConsolidated } from '../core/adopt.js';
import { isInteractiveStdin, parseCsv } from '../core/cli-flags.js';
import { adoptedDir } from '../core/paths.js';
import { t } from '../locales/index.js';

export interface AdoptOptions {
  yes?: boolean;
  out?: string;
  tools?: string;
}

export async function runAdopt(opts: AdoptOptions = {}): Promise<number> {
  p.intro(t('adopt.title'));
  const projectDir = process.cwd();

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
