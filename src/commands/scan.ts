import path from 'node:path';
import * as p from '@clack/prompts';
import { adapters } from '../adapters/index.js';
import { buildFingerprint } from '../core/fingerprint.js';
import { fingerprintPath } from '../core/paths.js';
import { writeYamlFile } from '../core/yaml-file.js';
import { t } from '../locales/index.js';

export interface ScanOptions {
  out?: string;
}

export async function runScan(opts: ScanOptions = {}): Promise<number> {
  p.intro(t('scan.title'));
  const projectDir = process.cwd();

  const spinner = p.spinner();
  spinner.start(t('scan.scanning'));
  const fingerprint = await buildFingerprint(projectDir, adapters);
  spinner.stop(t('common.done'));

  const topLang = fingerprint.languages[0];
  console.log(
    t('scan.summary', {
      languages: fingerprint.languages.length,
      topLang: topLang ? `${topLang.ext} (${topLang.files})` : '-',
      manifests: fingerprint.manifests.length,
      rules: fingerprint.existingRules.length,
    }),
  );

  const { history } = fingerprint;
  if (!history.available) {
    console.log(t('scan.history.none'));
  } else {
    console.log(
      t('scan.history.summary', {
        commits: history.commitsAnalyzed ?? 0,
        confidence: history.confidence ?? 'normal',
        hotspots: history.hotspots?.length ?? 0,
        coChanges: history.coChanges?.length ?? 0,
      }),
    );
    if (history.confidence === 'low') {
      console.log(t('scan.history.lowConfidence'));
    }
  }

  const outPath = opts.out ? path.resolve(projectDir, opts.out) : fingerprintPath(projectDir);
  await writeYamlFile(outPath, fingerprint);
  console.log(t('scan.written', { path: path.relative(projectDir, outPath) || outPath }));

  p.outro(t('common.done'));
  return 0;
}
